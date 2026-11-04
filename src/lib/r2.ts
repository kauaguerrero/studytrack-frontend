import 'server-only';
import { AwsClient } from 'aws4fetch';

/**
 * Cloudflare R2 (API S3) — imagens de redação.
 *
 * Bucket privado: o backend grava (studytrack-backend/app/services/core/r2_storage.py),
 * aqui só geramos URL assinada de leitura. As chaves são as mesmas do antigo
 * bucket `essay-images` do Supabase, então a chave sai de `image_url` /
 * `display_image_url` com o mesmo regex, seja a URL antiga ou nova.
 *
 * Env (só servidor): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_ESSAY_BUCKET (opcional, default "essay-images").
 */

/** Máximo permitido pelo SigV4 (7 dias). */
export const R2_MAX_SIGN_TTL_SECONDS = 7 * 24 * 3600;

let client: AwsClient | null = null;

function getClient(): AwsClient {
  if (client) return client;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY não definidas.');
  }
  client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
  return client;
}

export function r2Host(): string {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error('R2_ACCOUNT_ID não definida.');
  return `${accountId}.r2.cloudflarestorage.com`;
}

export function essayBucket(): string {
  return process.env.R2_ESSAY_BUCKET || 'essay-images';
}

/** Extrai a chave do objeto de uma URL de imagem de redação (Supabase antiga ou R2). */
export function essayImageKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.split('?')[0].match(/essay-images\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** URL assinada de leitura (GET) para um objeto do bucket de redações. */
export async function signEssayImageUrl(key: string, ttlSeconds = R2_MAX_SIGN_TTL_SECONDS): Promise<string> {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const url = new URL(`https://${r2Host()}/${essayBucket()}/${encodedKey}`);
  url.searchParams.set('X-Amz-Expires', String(Math.min(ttlSeconds, R2_MAX_SIGN_TTL_SECONDS)));
  const signed = await getClient().sign(new Request(url, { method: 'GET' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

/**
 * Apaga objetos do bucket de redações. DELETE no S3/R2 é idempotente (objeto
 * inexistente também volta 204), então chaves repetidas ou já apagadas não falham.
 */
export async function deleteEssayImages(keys: Array<string | null | undefined>): Promise<void> {
  const unique = [...new Set(keys.filter((k): k is string => !!k))];
  await Promise.all(
    unique.map(async (key) => {
      const encodedKey = key.split('/').map(encodeURIComponent).join('/');
      const res = await getClient().fetch(`https://${r2Host()}/${essayBucket()}/${encodedKey}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`R2 DELETE ${key} → ${res.status}`);
      }
    }),
  );
}

/** true se a URL (ex: `essays.signed_image_url` em cache) já é uma URL assinada do R2. */
export function isR2SignedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).host === r2Host();
  } catch {
    return false;
  }
}
