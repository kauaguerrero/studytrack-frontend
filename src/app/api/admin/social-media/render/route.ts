import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

// Binário do Chromium para ambientes serverless
const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';

// Necessário para Vercel — captura pode levar até 60s no cold start
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { html, width, height } = body as { html?: string; width?: number; height?: number };

  if (!html || !width || !height) {
    return NextResponse.json({ error: 'html, width e height são obrigatórios' }, { status: 400 });
  }

  let browser = null;
  try {
    const executablePath = await chromium.executablePath(CHROMIUM_URL);

    browser = await puppeteer.launch({
      args:            chromium.args,
      defaultViewport: { width, height, deviceScaleFactor: 2 },
      executablePath,
      headless:        true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Aguarda carregamento completo das fontes
    await page.evaluate(() => document.fonts.ready);

    const screenshot = await page.screenshot({
      type:     'png',
      fullPage: false,
      clip:     { x: 0, y: 0, width, height },
    });

    // Converte Uint8Array para Buffer para satisfazer a tipagem do NextResponse
    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        'Content-Type':        'image/png',
        'Content-Disposition': 'attachment; filename="post.png"',
      },
    });
  } finally {
    if (browser) await browser.close();
  }
}