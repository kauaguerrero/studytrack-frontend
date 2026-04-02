/**
 * _dalle-utils.ts
 *
 * Utilitários compartilhados para geração de backgrounds via DALL-E 3.
 * Usados em generate-post e adjust-post.
 */

import type { GeneratedPost, SocialMediaFormat } from '@/types/social-media';
import { createAdminClient } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// Mapa formato → tamanho DALL-E 3 (quadrado para feed_square, retrato para o resto)
const DALLE_SIZE: Record<SocialMediaFormat, '1024x1024' | '1024x1792'> = {
  feed_square:   '1024x1024',
  feed_portrait: '1024x1792',
  story:         '1024x1792',
  carousel:      '1024x1792',
};

/**
 * Chama a API DALL-E 3 e retorna a URL temporária da imagem gerada.
 * Retorna null em caso de falha (sem lançar exceção).
 */
export async function callDalle3(
  prompt:  string,
  format:  SocialMediaFormat,
  apiKey:  string,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:           'dall-e-3',
        prompt,
        n:               1,
        size:            DALLE_SIZE[format],
        quality:         'standard',
        response_format: 'url',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[SocialMedia/DALL-E] HTTP error:', res.status, errText);
      return null;
    }

    const data = (await res.json()) as { data: Array<{ url: string }> };
    return data.data?.[0]?.url ?? null;
  } catch (e) {
    console.error('[SocialMedia/DALL-E] Fetch failed:', e);
    return null;
  }
}

/**
 * Baixa a imagem de uma URL temporária do DALL-E e a sobe para o Supabase Storage,
 * retornando a URL pública permanente.
 * Em caso de falha no upload, retorna a URL temporária como fallback.
 */
export async function persistDalleBackground(
  tempUrl:       string,
  adminId:       string,
  supabaseAdmin: SupabaseAdmin,
): Promise<string> {
  try {
    const imgRes = await fetch(tempUrl);
    if (!imgRes.ok) {
      console.error('[SocialMedia/DALL-E] Failed to download image from temp URL');
      return tempUrl;
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const path   = `backgrounds/${adminId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error } = await supabaseAdmin.storage
      .from('social-media-posts')
      .upload(path, buffer, { contentType: 'image/png' });

    if (error) {
      console.error('[SocialMedia/DALL-E] Storage upload failed:', error.message);
      return tempUrl; // fallback: URL temporária (~1h de validade)
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('social-media-posts')
      .getPublicUrl(path);

    return publicUrl;
  } catch (e) {
    console.error('[SocialMedia/DALL-E] persistDalleBackground failed:', e);
    return tempUrl;
  }
}

/**
 * Para cada slide do post que possui `dalle_prompt` mas ainda não tem `dalle_image_url`,
 * chama DALL-E 3 e persiste a imagem no Supabase Storage.
 * Modifica o post in-place.
 */
export async function processDalleBackgrounds(
  post:          GeneratedPost,
  format:        SocialMediaFormat,
  adminId:       string,
  supabaseAdmin: SupabaseAdmin,
  openaiKey:     string,
): Promise<void> {
  const slidesNeedingDalle = post.slides.filter(
    (s) => s.elements.dalle_prompt?.trim() && !s.elements.dalle_image_url,
  );

  if (slidesNeedingDalle.length === 0) return;

  // Chama DALL-E em paralelo para todos os slides elegíveis
  const results = await Promise.all(
    slidesNeedingDalle.map(async (slide) => {
      const tempUrl = await callDalle3(slide.elements.dalle_prompt!, format, openaiKey);
      if (!tempUrl) return null;
      return persistDalleBackground(tempUrl, adminId, supabaseAdmin);
    }),
  );

  // Atribui as URLs de volta aos slides
  slidesNeedingDalle.forEach((slide, i) => {
    if (results[i]) {
      slide.elements.dalle_image_url = results[i];
    }
  });
}
