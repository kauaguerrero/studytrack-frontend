import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '@/app/api/admin/_utils';
import { getBrandPromptContext } from '@/lib/social-media-brand';
import { processDalleBackgrounds } from '@/app/api/admin/social-media/_dalle-utils';
import type { AdjustPostPayload, ClaudePostResponse, GeneratedPost, SocialMediaFormat } from '@/types/social-media';

// Ajuste pode incluir regeneração DALL-E
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { post_id, adjustment, current_post, format: payloadFormat } = body as AdjustPostPayload;

  if (!adjustment?.trim()) {
    return NextResponse.json({ error: 'Campo adjustment é obrigatório' }, { status: 400 });
  }
  if (!current_post) {
    return NextResponse.json({ error: 'Campo current_post é obrigatório' }, { status: 400 });
  }

  // Se post_id foi enviado, verifica que o post pertence a esse admin
  if (post_id) {
    const { data: post, error } = await auth.supabaseAdmin
      .from('social_media_posts')
      .select('id')
      .eq('id', post_id)
      .eq('admin_id', auth.user.id)
      .maybeSingle();

    if (error || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurado' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: `
POST ATUAL (JSON):
${JSON.stringify(current_post, null, 2)}

AJUSTE SOLICITADO PELO ADMIN:
"${adjustment}"

Aplique o ajuste e retorne o post completo modificado no mesmo schema JSON.
Mantenha tudo que não foi pedido para mudar.
Retorne APENAS o JSON, sem texto fora dele.

Schema de resposta:
{
  "needs_materials": false,
  "missing_materials": [],
  "post": { ...post completo modificado... }
}
        `.trim(),
      },
    ],
  });

  const rawText = message.content.find((b) => b.type === 'text')?.text ?? '';

  let claudeResponse: ClaudePostResponse;
  try {
    claudeResponse = parseClaudeJson<ClaudePostResponse>(rawText);
  } catch {
    return NextResponse.json({ error: 'Resposta inválida do Claude. Tente novamente.' }, { status: 502 });
  }

  if (claudeResponse.post) {
    const adjusted = claudeResponse.post as GeneratedPost;

    // Sanitiza custom_css
    if (adjusted.custom_css) {
      adjusted.custom_css = sanitizeCustomCss(adjusted.custom_css);
    }

    // Preserva dalle_image_url existente quando Claude não mudou o dalle_prompt.
    // Gera nova imagem DALL-E quando o prompt foi alterado ou a URL está ausente.
    adjusted.slides.forEach((slide, i) => {
      const prev = current_post.slides[i];
      if (!prev) return;
      const prevUrl    = prev.elements.dalle_image_url;
      const prevPrompt = prev.elements.dalle_prompt;
      const newPrompt  = slide.elements.dalle_prompt;

      if (prevUrl && newPrompt === prevPrompt) {
        // Prompt não mudou — reaproveita a imagem existente
        slide.elements.dalle_image_url = prevUrl;
      }
      // Se dalle_prompt mudou ou era null → processDalleBackgrounds gerará nova imagem
    });

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const format: SocialMediaFormat = payloadFormat ?? 'feed_square';
      await processDalleBackgrounds(adjusted, format, auth.user.id, auth.supabaseAdmin, openaiKey);
    }
  }

  return NextResponse.json(claudeResponse);
}

/** Remove seletores e declarações perigosas do CSS gerado pelo Claude. */
function sanitizeCustomCss(css: string): string {
  return css
    .replace(/\bbody\b/gi, '')
    .replace(/\bhtml\b/gi, '')
    .replace(/\*\s*\{/g, '')
    .replace(/position\s*:\s*fixed/gi, 'position: relative')
    .replace(/position\s*:\s*absolute/gi, 'position: relative')
    .replace(/@import\b/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function parseClaudeJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (match) return JSON.parse(match[1]) as T;
    throw new Error('JSON não encontrado');
  }
}

function buildSystemPrompt(): string {
  return `
Você é o social media designer e copywriter da StudyTrack.

${getBrandPromptContext()}

Você receberá um post já gerado (em JSON) e um ajuste solicitado pelo admin.
Aplique APENAS o ajuste pedido. Não altere o que não foi solicitado.

O post contém um campo "custom_css" com CSS injetado dentro de um elemento ".post-canvas".
Se o ajuste envolver mudanças visuais (cor, tipografia, espaçamento), atualize o "custom_css" adequadamente.
Use !important nas propriedades CSS para garantir que sobrescrevam os inline styles dos templates.
Nunca use seletores body, html, *, position:fixed ou position:absolute no custom_css.

Responda SEMPRE com JSON válido. NUNCA coloque texto fora do JSON.
`.trim();
}
