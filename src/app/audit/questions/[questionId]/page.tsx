import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
import { notFound } from 'next/navigation';
import { formatScientificText } from '@/lib/scientific-text';
import { createAdminClient } from '@/lib/supabase/admin';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ questionId: string }>;

interface Alternative {
  letter: string;
  text?: string | null;
  file?: string | null;
  image?: string | null;
  isCorrect?: boolean;
}

interface AuditQuestionRow {
  id: string;
  external_id: string;
  exam_year?: number | null;
  subject?: string | null;
  discipline?: string | null;
  title?: string | null;
  context?: string | null;
  statement?: string | null;
  alternatives_intro?: string | null;
  alternatives?: unknown;
  correct_alternative?: string | null;
  images?: unknown;
}

function extractMarkdownImageUrls(text?: string | null): string[] {
  if (!text) return [];
  const regex = /!\[[^\]]*\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) urls.push(match[1]);
  }
  return urls;
}

function parseAlternatives(value: unknown): Alternative[] {
  if (Array.isArray(value)) return value as Alternative[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function getVariantTitle(variant: string) {
  if (variant === 'simulado') return 'Render Audit • Simulado';
  if (variant === 'review') return 'Render Audit • Revisão';
  return 'Render Audit • Banco';
}

export default async function AuditQuestionPreview({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { questionId } = await params;
  const search = await searchParams;
  const variant = typeof search.variant === 'string' ? search.variant : 'bank';
  const auditKey = typeof search.audit_key === 'string' ? search.audit_key : '';
  const expectedKey = process.env.QUESTION_AUDIT_TOKEN;

  if (expectedKey && auditKey !== expectedKey) {
    notFound();
  }

  if (!['bank', 'simulado', 'review'].includes(variant)) {
    notFound();
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single<AuditQuestionRow>();

  if (!data) {
    notFound();
  }

  const alternatives = parseAlternatives(data.alternatives);
  const images = normalizeImages(data.images);
  const alternativeImageCount = alternatives.filter((alt) => Boolean((alt.file || alt.image || '').trim?.() || (alt.file || alt.image))).length;
  const contextMarkdownImageCount = extractMarkdownImageUrls(data.context).length;
  const introMarkdownImageCount = extractMarkdownImageUrls(data.alternatives_intro).length;
  const totalExpectedImages = images.length + alternativeImageCount + contextMarkdownImageCount + introMarkdownImageCount;

  return (
    <div
      data-audit-question-root="true"
      data-audit-variant={variant}
      data-question-id={data.id}
      data-external-id={data.external_id}
      data-expected-total-images={String(totalExpectedImages)}
      data-expected-question-images={String(images.length)}
      data-expected-alternative-images={String(alternativeImageCount)}
      data-expected-context-markdown-images={String(contextMarkdownImageCount)}
      data-expected-intro-markdown-images={String(introMarkdownImageCount)}
      className="min-h-screen bg-slate-100 p-8 text-slate-900"
    >
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            {getVariantTitle(variant)}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {data.subject}
          </span>
          {data.discipline && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {data.discipline}
            </span>
          )}
          {data.exam_year && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {data.exam_year}
            </span>
          )}
        </div>

        {images.length > 0 && (
          <div className="mb-6 space-y-4">
            {images.map((img, index) => (
              <div key={img + index} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Imagem de apoio ${index + 1}`} className="max-h-96 w-full object-contain" />
              </div>
            ))}
          </div>
        )}

        {data.context && (
          <div className="prose prose-slate mb-6 max-w-none border-l-4 border-slate-200 pl-4 text-sm text-slate-600">
            <SafeMarkdown>{formatScientificText(data.context)}</SafeMarkdown>
          </div>
        )}

        <div className="prose prose-slate mb-8 max-w-none text-lg">
          <SafeMarkdown>{formatScientificText(data.alternatives_intro || data.statement || data.title || '')}</SafeMarkdown>
        </div>

        <div className="space-y-3">
          {alternatives.map((alt) => {
            const altImage = alt.file || alt.image;
            const isCorrect = String(alt.letter || '').toUpperCase() === String(data.correct_alternative || '').toUpperCase();
            const reviewStyle = variant === 'review' && isCorrect
              ? 'border-green-300 bg-green-50'
              : 'border-slate-200 bg-white';
            return (
              <div key={alt.letter} className={`flex gap-4 rounded-2xl border p-4 ${reviewStyle}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-sm font-bold text-slate-700">
                  {alt.letter}
                </div>
                <div className="flex-1">
                  {altImage && (
                    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={altImage} alt={`Alternativa ${alt.letter}`} data-audit-role="alternative-image" className="max-h-72 w-full object-contain" />
                    </div>
                  )}
                  {alt.text ? (
                    <div className="text-base leading-relaxed text-slate-800">{formatScientificText(alt.text)}</div>
                  ) : !altImage ? (
                    <div className="text-sm italic text-slate-400">Conteúdo da alternativa indisponível.</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
