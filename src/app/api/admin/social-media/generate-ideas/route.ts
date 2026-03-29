import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '@/app/api/admin/_utils';
import { getBrandPromptContext } from '@/lib/social-media-brand';
import type { GenerateIdeasPayload, PostIdea, SocialMediaTheme } from '@/types/social-media';

const FORMAT_LABEL: Record<string, string> = {
  feed_square:   'Post Feed quadrado (1080×1080px)',
  feed_portrait: 'Post Feed retrato (1080×1350px)',
  story:         'Story (1080×1920px)',
  carousel:      'Carrossel (1080×1350px por slide)',
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { format, slide_count } = body as GenerateIdeasPayload;

  if (!format) {
    return NextResponse.json({ error: 'Campo format é obrigatório' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurado' }, { status: 500 });
  }

  // Busca os últimos 20 posts para evitar repetição de temas
  const { data: recentPosts } = await auth.supabaseAdmin
    .from('social_media_posts')
    .select('title, theme, template_used')
    .eq('admin_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const recentSummary = recentPosts && recentPosts.length > 0
    ? recentPosts.map((p: { title: string; theme: string }) => `- ${p.theme}: "${p.title}"`).join('\n')
    : 'Nenhum post gerado ainda.';

  const formatLabel = FORMAT_LABEL[format] ?? format;
  const slideInfo = format === 'carousel' && slide_count
    ? ` com ${slide_count} slides`
    : '';

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: `
Gere 3 ideias criativas e diferentes entre si para um post no Instagram.

FORMATO SOLICITADO: ${formatLabel}${slideInfo}

HISTÓRICO RECENTE (evite repetir temas e ângulos):
${recentSummary}

Retorne APENAS um JSON válido, sem texto fora do JSON, seguindo exatamente este schema:
{
  "ideas": [
    {
      "id": "idea_1",
      "title": "Título interno do post (máx 60 caracteres)",
      "concept": "Descrição do conceito visual em 1-2 frases (máx 120 caracteres)",
      "theme": "educational | motivational | meme | informational | promotional"
    },
    { "id": "idea_2", ... },
    { "id": "idea_3", ... }
  ]
}
        `.trim(),
      },
    ],
  });

  const rawText = message.content.find((b) => b.type === 'text')?.text ?? '';

  let ideas: PostIdea[];
  try {
    const parsed = JSON.parse(rawText) as { ideas: Array<{ id: string; title: string; concept: string; theme: string }> };
    ideas = parsed.ideas.map((idea) => ({
      id:      idea.id,
      title:   idea.title,
      concept: idea.concept,
      theme:   idea.theme as SocialMediaTheme,
    }));
  } catch {
    // Segunda tentativa: extrai JSON de bloco de código se Claude adicionou markdown
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]+?)```/);
      if (!jsonMatch) throw new Error('JSON não encontrado');
      const parsed = JSON.parse(jsonMatch[1]) as { ideas: Array<{ id: string; title: string; concept: string; theme: string }> };
      ideas = parsed.ideas.map((idea) => ({
        id:      idea.id,
        title:   idea.title,
        concept: idea.concept,
        theme:   idea.theme as SocialMediaTheme,
      }));
    } catch {
      return NextResponse.json({ error: 'Resposta inválida do Claude. Tente novamente.' }, { status: 502 });
    }
  }

  return NextResponse.json({ ideas });
}

function buildSystemPrompt(): string {
  return `
Você é o social media designer e copywriter da StudyTrack.

${getBrandPromptContext()}

REGRAS PARA GERAÇÃO DE IDEIAS:
1. Cada ideia deve ter um ângulo único e surpreendente — evite o óbvio.
2. Pense em formatos que performam bem no Instagram: listas, dados, frases de impacto, memes educacionais.
3. O público são estudantes brasileiros Gen Z (16–22 anos) preparando para ENEM/vestibulares.
4. Ideias devem ser variadas entre si: temáticas, formatos visuais e tons diferentes.
5. Responda SEMPRE com JSON válido. Nenhum texto fora do JSON.
`.trim();
}
