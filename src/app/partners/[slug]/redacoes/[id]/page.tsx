'use client';

import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ElevatedCard, SectionTitle } from '@/components/partners/founder-ui';
import { readableBrandText, readableBrandTextOnDark, resolveAccentColor } from '@/lib/brand-color';
import FloatingActionMenu from '@/components/ui/floating-action-menu';
import { BrokenPencilIllustration } from '@/components/ui/broken-pencil-illustration';
import { cn, normalizeEssayLineBreaks } from '@/lib/utils';
import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';
import { ArrowLeft, ChevronLeft, ChevronRight, Hand, Info, MessageCircle, MousePointer2, PenLine, PencilLine, Send, Users, X } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { useOrgCorrectionPresence } from '@/hooks/useOrgCorrectionPresence';
import { createClient } from '@/lib/supabase/client';
import {
  MOCK_ESSAYS_OVERVIEW,
  MOCK_STUDENT_ESSAY_COMPETENCY_SCORES,
} from '../../../../../../studytrack-tutorial-mock';

type Annotation = {
  id: string;
  start_offset: number;
  end_offset: number;
  type: 'comment' | 'correction';
  comment_text: string | null;
  original_text: string | null;
  corrected_text: string | null;
};

type CompetencyScore = {
  competency: number;
  score: number;
  comment: string;
};

type CorrectorInfo = { id: string; full_name: string | null; avatar_url: string | null; role?: string | null };

type CorrectionRound = {
  round: number;
  total_score: number;
  general_comment: string | null;
  corrected_at: string | null;
  corrector_name?: string | null;
  corrector_avatar_url?: string | null;
};

type EssayDetail = {
  id: string;
  status: 'pending' | 'corrected' | 'awaiting_second' | 'second_corrected' | 'seen';
  essay_type?: string | null;
  theme?: string | null;
  text: string;
  submitted_at: string;
  corrected_at: string | null;
  second_corrected_at: string | null;
  total_score: number | null;
  average_score: number | null;
  general_comment: string | null;
  second_corrector_id: string | null;
  second_corrector_name: string | null;
  second_correction_requested_by_name?: string | null;
  second_correction_requested_at: string | null;
  competency_scores: Array<{
    competency: number;
    score: number;
    comment: string | null;
    correction_round?: number;
  }>;
  annotations: Array<{
    id: string;
    start_offset: number;
    end_offset: number;
    type: 'comment' | 'correction';
    comment_text: string | null;
    original_text: string | null;
    corrected_text: string | null;
    correction_round?: number;
  }>;
  corrections: CorrectionRound[];
  signed_image_url?: string | null;
};

type SelectedTextState = { start: number; end: number; text: string };
type PopupState = { x: number; y: number };
type PopupMode = 'comment' | 'correction' | null;

type Segment = {
  key: string;
  start: number;
  end: number;
  text: string;
  annotation: Annotation | null;
  pending: boolean;
};

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function getTotalColorClass(total: number, max: number): string {
  const pct = max > 0 ? total / max : 0;
  if (pct >= 0.7) return 'text-emerald-400';
  if (pct >= 0.5) return 'text-amber-300';
  return 'text-rose-400';
}

function hasIgnoredAncestor(node: Node, stopAt: HTMLElement): boolean {
  let current: Node | null = node;
  while (current && current !== stopAt) {
    if (current instanceof HTMLElement && current.dataset.ignoreOffset === 'true') {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

function getOffsetWithinContainer(
  container: HTMLElement,
  targetNode: Node,
  targetOffset: number,
): number | null {
  if (!container.contains(targetNode)) return null;
  if (hasIgnoredAncestor(targetNode, container)) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    if (!hasIgnoredAncestor(textNode, container)) {
      if (textNode === targetNode) {
        return offset + Math.min(targetOffset, textNode.data.length);
      }
      offset += textNode.data.length;
    }
    current = walker.nextNode();
  }

  return null;
}

function buildSegments(
  text: string,
  annotations: Annotation[],
  pendingRange: { start: number; end: number } | null,
): Segment[] {
  if (!text.length) return [];

  const owner: Array<Annotation | null> = new Array(text.length).fill(null);

  // Última annotation adicionada tem prioridade.
  annotations.forEach((ann) => {
    const start = Math.max(0, Math.min(text.length, ann.start_offset));
    const end = Math.max(start, Math.min(text.length, ann.end_offset));
    for (let i = start; i < end; i += 1) {
      owner[i] = ann;
    }
  });

  // Trecho selecionado com o popup Comentar/Corrigir aberto — substitui o
  // destaque nativo do navegador, que a gente derruba manualmente (ver
  // handleTextMouseUp) pra não brigar com o menu de seleção do iOS.
  const pending: boolean[] = new Array(text.length).fill(false);
  if (pendingRange) {
    const start = Math.max(0, Math.min(text.length, pendingRange.start));
    const end = Math.max(start, Math.min(text.length, pendingRange.end));
    for (let i = start; i < end; i += 1) {
      pending[i] = true;
    }
  }

  const segments: Segment[] = [];
  let start = 0;
  let currentOwner = owner[0];
  let currentPending = pending[0];

  for (let i = 1; i < text.length; i += 1) {
    const nextOwner = owner[i];
    const nextPending = pending[i];
    if (nextOwner !== currentOwner || nextPending !== currentPending) {
      segments.push({
        key: `${start}-${i}-${currentOwner?.id || 'plain'}-${currentPending ? 'p' : ''}`,
        start,
        end: i,
        text: text.slice(start, i),
        annotation: currentOwner,
        pending: currentPending,
      });
      start = i;
      currentOwner = nextOwner;
      currentPending = nextPending;
    }
  }

  // Fecha o último segmento (inclui o caso sem anotações).
  segments.push({
    key: `${start}-${text.length}-${currentOwner?.id || 'plain'}-${currentPending ? 'p' : ''}`,
    start,
    end: text.length,
    text: text.slice(start, text.length),
    annotation: currentOwner,
    pending: currentPending,
  });

  return segments;
}

function pickEssayTheme(raw: Record<string, unknown>): string | null {
  const candidateKeys = [
    'theme',
    'essay_theme',
    'tema',
    'proposal',
    'prompt',
    'topic',
    'title',
  ];

  for (const key of candidateKeys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export default function CorrecaoRedacaoPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const { org, userProfile } = useOrg();
  const textContainerRef = useRef<HTMLDivElement | null>(null);

  const [essay, setEssay] = useState<EssayDetail | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [scores, setScores] = useState<CompetencyScore[]>(
    Array.from({ length: 5 }, (_, idx) => ({
      competency: idx + 1,
      score: 0,
      comment: '',
    })),
  );
  const [generalComment, setGeneralComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedText, setSelectedText] = useState<SelectedTextState | null>(null);
  const [annotationPopup, setAnnotationPopup] = useState<PopupState | null>(null);
  const [popupMode, setPopupMode] = useState<PopupMode>(null);
  const [queuedMode, setQueuedMode] = useState<PopupMode>(null);
  const [popupValue, setPopupValue] = useState('');
  const [showCompetencyPanel, setShowCompetencyPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para modal de devolução / segunda correção
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [viewingComment, setViewingComment] = useState<{ text: string; excerpt: string } | null>(null);
  const [requestSecond, setRequestSecond] = useState(false);
  const [secondCorrectorMode, setSecondCorrectorMode] = useState<'random' | 'specific'>('random');
  const [correctors, setCorrectors] = useState<CorrectorInfo[]>([]);
  const [selectedCorrectorId, setSelectedCorrectorId] = useState<string>('');
  const [loadingCorrectors, setLoadingCorrectors] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [lockOwned, setLockOwned] = useState(false);
  const lockOwnedRef = useRef(false);



  // Busca ID do usuário atual para verificar se é o segundo corretor alocado
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Presença em tempo real: anuncia que este corretor está com a redação aberta.
  // Só rastreia quando essay está pending (rodada 1); awaiting_second já tem lock via second_corrector_id.
  const isPendingEssay = essay?.status === 'pending';
  useOrgCorrectionPresence({
    orgId: org.id,
    currentUserId,
    currentUserName: userProfile.fullName,
    currentUserAvatarUrl: userProfile.avatarUrl,
    trackingEssayId: isPendingEssay && currentUserId && lockOwned ? id : undefined,
  });

  useEffect(() => {
    let mounted = true;

    async function loadEssay() {
      setLoading(true);
      setError(null);

      if (org.is_mock) {
        if (!mounted) return;
        const corrected = MOCK_ESSAYS_OVERVIEW.corrected_items as Array<{ id: string; status: string; essay_type: string; theme: string; submitted_at: string; corrected_at: string; total_score: number; average_score: null; text: string; student: { id: string; full_name: string; email: string; avatar_url: null } }>;
        const mockEssay = corrected.find(e => e.id === id) ?? corrected[0];
        const rawScores = (MOCK_STUDENT_ESSAY_COMPETENCY_SCORES as unknown as Array<{ essay_id: string; competency: number; score: number; correction_round: number }>);
        const filteredScores = rawScores.filter(s => s.essay_id === mockEssay.id);
        const mockScores = (filteredScores.length > 0 ? filteredScores : rawScores.slice(0, 5))
          .map(s => ({ competency: s.competency, score: s.score, comment: '' }));
        const generalComment = 'Redação de alto nível. A proposta de intervenção foi bem articulada com os mecanismos linguísticos e demonstra visão crítica aprofundada.';
        setEssay({
          ...mockEssay,
          text: normalizeEssayLineBreaks(mockEssay.text),
          annotations: [],
          corrections: [{ round: 1, total_score: mockEssay.total_score, general_comment: generalComment, corrected_at: mockEssay.corrected_at, corrector_name: 'Prof. Carla Mendes', corrector_avatar_url: null }],
          second_corrector_id: null,
          second_corrector_name: null,
          second_corrected_at: null,
          average_score: null,
          second_correction_requested_at: null,
          general_comment: generalComment,
          competency_scores: mockScores,
        } as unknown as EssayDetail);
        setAnnotations([]);
        setScores(mockScores);
        setGeneralComment(generalComment);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/partners/${slug}/essays/${id}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Erro HTTP ${res.status}`);
        }
        const data = await res.json() as EssayDetail & Record<string, unknown>;
        if (!mounted) return;

        setEssay({
          ...data,
          text: normalizeEssayLineBreaks(data.text),
          theme: pickEssayTheme(data),
          corrections: data.corrections || [],
          second_corrector_id: data.second_corrector_id ?? null,
          second_corrector_name: data.second_corrector_name ?? null,
          second_corrected_at: data.second_corrected_at ?? null,
          average_score: data.average_score ?? null,
          second_correction_requested_at: data.second_correction_requested_at ?? null,
        });

        // Para a segunda correção, carregar apenas anotações da rodada 1 como referência
        // e iniciar com formulário limpo
        const allAnnotations = (data.annotations || []) as Array<{
          id: string; start_offset: number; end_offset: number;
          type: 'comment' | 'correction'; comment_text: string | null;
          original_text: string | null; corrected_text: string | null;
          correction_round?: number;
        }>;
        const isRound2 = data.status === 'awaiting_second';
        setAnnotations(
          allAnnotations
            .filter((a) => isRound2 ? false : (a.correction_round ?? 1) === 1)
            .map((a) => ({
              id: a.id || crypto.randomUUID(),
              start_offset: a.start_offset,
              end_offset: a.end_offset,
              type: a.type,
              comment_text: a.comment_text,
              original_text: a.original_text,
              corrected_text: a.corrected_text,
            })),
        );

        const loadedTypeConfig = ESSAY_TYPE_CONFIGS[(data.essay_type as EssayType) || 'enem'] ?? ESSAY_TYPE_CONFIGS.enem;
        const allScores = (data.competency_scores || []) as Array<{ competency: number; score: number; comment: string | null; correction_round?: number }>;
        const normalizedScores = Array.from({ length: loadedTypeConfig.competencies.length }, (_, idx) => {
          const comp = idx + 1;
          // Para round 2, inicia zerado; para round 1, carrega existente
          const existing = isRound2
            ? null
            : allScores.find((s) => s.competency === comp && (s.correction_round ?? 1) === 1);
          return {
            competency: comp,
            score: existing?.score ?? 0,
            comment: existing?.comment ?? '',
          };
        });
        setScores(normalizedScores);
        // Para round 2, comentário geral começa vazio
        setGeneralComment(isRound2 ? '' : (data.general_comment || ''));
      } catch {
        if (mounted) setError('Não foi possível carregar esta redação.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEssay();
    return () => {
      mounted = false;
    };
  }, [id, slug, org.is_mock]);

  useEffect(() => {
    if (!essay || !currentUserId) return;
    if (essay.status !== 'pending' && essay.status !== 'awaiting_second') return;
    if (essay.status === 'awaiting_second' && essay.second_corrector_id && essay.second_corrector_id !== currentUserId) return;

    let cancelled = false;
    let heartbeat: number | null = null;
    async function acquireLock() {
      try {
        const res = await fetch(`/api/partners/${slug}/essays/${id}/lock`, { method: 'PATCH' });
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        if (cancelled) return;
        if (!res.ok) {
          toast.warning(payload?.error || 'Esta redação já está sendo corrigida.');
          router.push(`/partners/${slug}/redacoes`);
          return;
        }
        lockOwnedRef.current = true;
        setLockOwned(true);
        heartbeat = window.setInterval(() => {
          void fetch(`/api/partners/${slug}/essays/${id}/lock`, { method: 'PATCH' });
        }, 30_000);
      } catch {
        if (!cancelled) {
          toast.error('Não foi possível reservar esta redação para correção.');
          router.push(`/partners/${slug}/redacoes`);
        }
      }
    }

    void acquireLock();
    return () => {
      cancelled = true;
      if (heartbeat !== null) window.clearInterval(heartbeat);
      setLockOwned(false);
    };
  }, [essay, currentUserId, id, slug, router]);

  useEffect(() => {
    return () => {
      if (!lockOwnedRef.current) return;
      void fetch(`/api/partners/${slug}/essays/${id}/lock`, {
        method: 'DELETE',
        keepalive: true,
      });
    };
  }, [id, slug]);

  const totalScore = useMemo(
    () => scores.reduce((acc, item) => acc + (item.score || 0), 0),
    [scores],
  );

  const isLockedForCurrentUser = useMemo(() => {
    if (!essay || !currentUserId) return false;
    return essay.status === 'awaiting_second' && !!essay.second_corrector_id && essay.second_corrector_id !== currentUserId;
  }, [essay, currentUserId]);

  const canSubmit = useMemo(() => {
    if (isLockedForCurrentUser) return false;
    const hasGeneral = generalComment.trim().length >= 20;
    return hasGeneral && !submitting;
  }, [generalComment, submitting, isLockedForCurrentUser]);

  const segments = useMemo(
    () =>
      buildSegments(
        essay?.text || '',
        annotations,
        selectedText ? { start: selectedText.start, end: selectedText.end } : null,
      ),
    [essay?.text, annotations, selectedText],
  );

  function closePopup() {
    setAnnotationPopup(null);
    setSelectedText(null);
    setPopupMode(null);
    setPopupValue('');
    window.getSelection()?.removeAllRanges();
  }

  function handleTextMouseUp() {
    const container = textContainerRef.current;
    if (!container || !essay?.text) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      return;
    }

    const start = getOffsetWithinContainer(container, range.startContainer, range.startOffset);
    const end = getOffsetWithinContainer(container, range.endContainer, range.endOffset);

    if (start === null || end === null) return;

    const offsetStart = Math.min(start, end);
    const offsetEnd = Math.max(start, end);
    if (offsetEnd <= offsetStart) return;

    const selected = essay.text.slice(offsetStart, offsetEnd);
    if (!selected.trim()) return;

    const rect = range.getBoundingClientRect();
    const POPUP_W = 288; // w-72
    const POPUP_H_EST = 160; // estimativa para checar overflow vertical
    const MARGIN = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rawX = rect.left + rect.width / 2;
    // Clampa horizontalmente para o popup não sair da tela
    const clampedX = Math.min(Math.max(rawX, POPUP_W / 2 + MARGIN), vw - POPUP_W / 2 - MARGIN);
    // Mostra acima da seleção se não couber abaixo
    const fitsBelow = rect.bottom + POPUP_H_EST + MARGIN < vh;
    const clampedY = fitsBelow ? rect.bottom + 8 : Math.max(MARGIN, rect.top - POPUP_H_EST - 8);
    // -webkit-touch-callout:none no container não basta pro iOS: o menu nativo
    // de seleção (Copy/Look Up/...) é da API Selection, não do callout de
    // toque em link/imagem. Limpar a seleção nativa aqui derruba esse menu na
    // hora — o popup próprio (abaixo) já mostra o trecho selecionado.
    selection.removeAllRanges();

    setSelectedText({
      start: offsetStart,
      end: offsetEnd,
      text: selected,
    });
    setAnnotationPopup({ x: clampedX, y: clampedY });
    setPopupMode(queuedMode);
    setQueuedMode(null);
    setPopupValue('');
  }

  function requestAnnotationMode(mode: Exclude<PopupMode, null>) {
    if (selectedText && annotationPopup) {
      setPopupMode(mode);
      return;
    }
    setQueuedMode(mode);
    toast.message(
      mode === 'comment'
        ? 'Selecione um trecho para adicionar o comentário.'
        : 'Selecione um trecho para adicionar a correção.',
    );
  }

  function addAnnotation() {
    if (!selectedText || !popupMode) return;

    if (!popupValue.trim()) {
      toast.error('Preencha o conteúdo da anotação.');
      return;
    }

    const next: Annotation = {
      id: crypto.randomUUID(),
      start_offset: selectedText.start,
      end_offset: selectedText.end,
      type: popupMode,
      comment_text: popupMode === 'comment' ? popupValue.trim() : null,
      original_text: selectedText.text,
      corrected_text: popupMode === 'correction' ? popupValue.trim() : null,
    };

    setAnnotations((prev) => [...prev, next]);
    closePopup();
  }

  function removeAnnotation(annotationId: string) {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId));
  }

  function scrollToAnnotation(annotationId: string) {
    const element = textContainerRef.current?.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function fetchCorrectors() {
    if (correctors.length > 0) return;
    setLoadingCorrectors(true);
    try {
      const res = await fetch(`/api/partners/${slug}/correctors`);
      if (res.ok) {
        const data = await res.json() as CorrectorInfo[];
        // Exclui o corretor atual da lista
        setCorrectors(data.filter((c) => c.id !== currentUserId));
      }
    } catch {
      // ignora — lista fica vazia
    } finally {
      setLoadingCorrectors(false);
    }
  }

  function handleSubmitClick() {
    if (!essay) return;
    if (!canSubmit) return;
    // Abre o modal de escolha apenas na rodada 1 (status pending)
    if (essay.status === 'pending') {
      setShowDeliveryModal(true);
      void fetchCorrectors();
    } else {
      // Rodada 2: submete diretamente
      void doSubmitCorrection({ secondRequest: false, secondCorrectorId: null });
    }
  }

  async function doSubmitCorrection({
    secondRequest,
    secondCorrectorId,
    redirectAfter = true,
  }: { secondRequest: boolean; secondCorrectorId: string | null; redirectAfter?: boolean }): Promise<boolean> {
    if (!essay) return false;

    setSubmitting(true);
    setShowDeliveryModal(false);
    try {
      const payload: Record<string, unknown> = {
        competency_scores: scores.map((s) => ({
          competency: s.competency,
          score: s.score,
          comment: s.comment || '',
        })),
        annotations,
        general_comment: generalComment.trim(),
        request_second_correction: secondRequest,
        second_corrector_id: secondCorrectorId,
      };

      const res = await fetch(`/api/partners/${slug}/essays/${essay.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string; locked?: boolean } | null;
        throw new Error(data?.error || 'Não foi possível enviar a correção.');
      }
      const responseData = await res.json().catch(() => null) as {
        ok?: boolean;
        warning?: string | null;
        action?: string;
        second_corrector?: { id: string; full_name: string | null };
      } | null;

      if (responseData?.action === 'second_correction_requested') {
        const name = responseData.second_corrector?.full_name || 'outro corretor';
        toast.success(`Segunda correção solicitada para ${name}!`);
      } else if (essay.status === 'awaiting_second') {
        toast.success('Segunda correção enviada! O aluno será notificado.');
      } else {
        toast.success('Correção enviada! O aluno será notificado.');
      }

      if (responseData?.warning) {
        toast.warning(responseData.warning);
      }
      if (redirectAfter) {
        router.push(`/partners/${slug}/redacoes`);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar correção.';
      toast.error(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAndExit(): Promise<boolean> {
    if (generalComment.trim().length < 20) {
      toast.error('Escreva o comentário geral (mínimo de 20 caracteres) antes de sair salvando.');
      return false;
    }
    return doSubmitCorrection({ secondRequest: false, secondCorrectorId: null, redirectAfter: false });
  }

  const hasUnsavedCorrectionWork = lockOwned && (
    generalComment.trim().length > 0
    || scores.some((s) => s.score > 0 || s.comment.trim().length > 0)
    || annotations.length > 0
  );

  function renderAnnotatedText(): ReactNode {
    return segments.map((segment) => {
      // Substitui o destaque nativo de seleção do navegador (derrubado em
      // handleTextMouseUp) enquanto o popup Comentar/Corrigir está aberto.
      const pendingCls = segment.pending ? 'rounded bg-sky-300/60 dark:bg-sky-400/40' : '';

      if (!segment.annotation) {
        if (!segment.pending) {
          return <Fragment key={segment.key}>{segment.text}</Fragment>;
        }
        return (
          <span key={segment.key} className={pendingCls}>
            {segment.text}
          </span>
        );
      }

      if (segment.annotation.type === 'comment') {
        const commentText = segment.annotation.comment_text || '';
        return (
          <button
            key={segment.key}
            type="button"
            data-annotation-id={segment.annotation.id}
            onClick={() => setViewingComment({ text: commentText, excerpt: segment.text })}
            className={cn(
              'inline cursor-pointer rounded bg-amber-400/10 px-0.5 text-left text-amber-700 underline decoration-amber-500/80 underline-offset-2 dark:text-amber-100 dark:decoration-amber-300/80',
              pendingCls,
            )}
          >
            {segment.text}
          </button>
        );
      }

      const original = segment.annotation.original_text || segment.text;
      const corrected = segment.annotation.corrected_text || '';
      return (
        <span key={segment.key} data-annotation-id={segment.annotation.id} className={pendingCls}>
          <span className="line-through text-rose-600 dark:text-rose-400">{original}</span>
          {corrected && (
            <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400" data-ignore-offset="true">
              {corrected}
            </span>
          )}
        </span>
      );
    });
  }

  const essayType = (essay?.essay_type || 'enem') as EssayType;
  const typeConfig = ESSAY_TYPE_CONFIGS[essayType] ?? ESSAY_TYPE_CONFIGS.enem;

  // Cor "secondary" da marca com fallback seguro (accent → primary) para
  // quando o cliente não configurou uma secondary com identidade cromática —
  // evita a barra de destaque do card sumir e o texto ficar ilegível.
  const secondaryAccent = resolveAccentColor(org, 'brand_secondary');
  const secondaryTextStyle = {
    ['--bta-light' as string]: readableBrandText(secondaryAccent.hex, secondaryAccent.cssVar),
    ['--bta-dark' as string]: readableBrandTextOnDark(secondaryAccent.hex, secondaryAccent.cssVar),
  };
  const primaryTextStyle = {
    ['--bta-light' as string]: readableBrandText(org.brand_primary, 'var(--brand-primary)'),
    ['--bta-dark' as string]: readableBrandTextOnDark(org.brand_primary, 'var(--brand-primary)'),
  };

  const competencyPanelContent = (
    <>
      <div className="space-y-4">
        {scores.map((item, idx) => (
          <div key={item.competency} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Competência {item.competency} — {typeConfig.competencies[idx]}
            </p>

            <div className="mb-2 flex flex-wrap gap-1.5">
              {typeConfig.score_options[idx].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setScores((prev) =>
                      prev.map((s) => (
                        s.competency === item.competency
                          ? { ...s, score: option }
                          : s
                      )),
                    );
                  }}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs font-semibold transition',
                    item.score === option
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] dark:text-white'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-500',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Nota selecionada: <span className="text-slate-900 dark:text-white">{item.score} / {typeConfig.score_options[idx].at(-1)}</span>
            </p>

            <textarea
              value={item.comment}
              onChange={(e) => {
                const nextComment = e.target.value;
                setScores((prev) =>
                  prev.map((s) => (
                    s.competency === item.competency
                      ? { ...s, comment: nextComment }
                      : s
                  )),
                );
              }}
              placeholder="Comentário da competência (opcional)"
              className="min-h-[64px] w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</p>
        <p className={cn('text-3xl font-extrabold', getTotalColorClass(totalScore, typeConfig.total_max))}>
          {totalScore} / {typeConfig.total_max}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Comentário Geral
        </label>
        <textarea
          value={generalComment}
          onChange={(e) => setGeneralComment(e.target.value)}
          placeholder="Escreva um comentário geral da redação (mín. 20 caracteres)"
          className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmitClick}
        disabled={!canSubmit}
        className="mt-4 hidden min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex"
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Enviando...' : (essay?.status === 'awaiting_second' ? 'Enviar 2ª Correção' : 'Enviar Correção')}
      </button>
    </>
  );

  if (loading) {
    return (
      <PartnerLayout>
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-xl bg-slate-800/80" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
        </div>
      </PartnerLayout>
    );
  }

  if (error || !essay) {
    return (
      <PartnerLayout>
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <BrokenPencilIllustration className="mb-1 h-auto w-48 sm:w-56" />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-500 dark:text-red-400">
            Algo deu errado
          </p>
          <p className="font-display mt-1.5 max-w-sm text-base font-bold text-slate-900 dark:text-white">
            {error || 'Redação não encontrada.'}
          </p>
          <Link
            href={`/partners/${slug}/redacoes`}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para redações
          </Link>
        </div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout unsavedChangesGuard={{ hasUnsavedChanges: hasUnsavedCorrectionWork, onSaveAndExit: saveAndExit }}>
      <div className="space-y-5 pb-24 lg:pb-0">
        <div className="space-y-4">
          <Link
            href={`/partners/${slug}/redacoes`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 -ml-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para fila
          </Link>

          <SectionTitle
            kicker="Mesa de correção"
            title={`Correção — ${formatDateBR(essay.submitted_at)}`}
            hex={org.brand_primary}
            action={
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {typeConfig.label}
              </span>
            }
          />

          <ElevatedCard accentColor={org.brand_primary} className="p-4">
            <p className="brand-text-adaptive mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={primaryTextStyle}>
              <PenLine className="h-3.5 w-3.5" />
              Tema da redação
            </p>
            <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
              {essay.theme || 'Tema não informado pelo aluno.'}
            </p>
          </ElevatedCard>

          <ElevatedCard accentColor={secondaryAccent.hex ?? undefined} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="brand-text-adaptive mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={secondaryTextStyle}>
                  <Info className="h-3.5 w-3.5" />
                  Como corrigir rapidamente
                </p>
                <div className="space-y-1.5">
                  <p className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <MousePointer2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                    <span>
                      <span className="font-semibold">No computador:</span> clique no início do trecho, segure e
                      arraste o mouse até o final para selecionar.
                    </span>
                  </p>
                  <p className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Hand className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                    <span>
                      <span className="font-semibold">No celular:</span> encoste o dedo no início do trecho, sem
                      soltar, e arraste devagar até o final da parte que quer marcar.
                    </span>
                  </p>
                  <p className="border-t border-slate-200 pt-1.5 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">
                    Depois de marcar o trecho, toque em <span className="font-semibold">Comentar</span> ou{' '}
                    <span className="font-semibold">Corrigir</span> no menu que aparece.
                    {queuedMode && (
                      <span className="brand-text-adaptive ml-1 font-semibold" style={primaryTextStyle}>
                        Ação escolhida: {queuedMode === 'comment' ? 'Comentário' : 'Correção'}.
                      </span>
                    )}
                  </p>
                </div>
                <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2 dark:border-slate-800">
                  <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2">
                    <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      <span className="font-semibold">Comentar:</span> deixa uma observação sobre o trecho, sem
                      alterar o texto do aluno. Use para explicar um erro ou dar uma dica.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-2">
                    <PencilLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm text-emerald-900 dark:text-emerald-100">
                      <span className="font-semibold">Corrigir:</span> propõe a reescrita do trecho. O original
                      aparece riscado e a sua correção aparece ao lado, para o aluno comparar.
                    </p>
                  </div>
                </div>
              </div>
              {/* Atalho redundante com "selecionar trecho → Comentar/Corrigir" — no
                  mobile o menu flutuante fica cortado/instável, então só aparece
                  a partir do breakpoint onde há espaço sobrando de verdade. */}
              <div className="hidden self-end lg:block sm:self-auto">
                <FloatingActionMenu
                  className="!static !bottom-auto !right-auto"
                  inline
                  options={[
                    {
                      label: 'Adicionar comentário',
                      Icon: <MessageCircle className="h-4 w-4" />,
                      onClick: () => requestAnnotationMode('comment'),
                    },
                    {
                      label: 'Adicionar correção',
                      Icon: <PencilLine className="h-4 w-4" />,
                      onClick: () => requestAnnotationMode('correction'),
                    },
                  ]}
                />
              </div>
            </div>
          </ElevatedCard>
        </div>

        {/* Banner: corretor está alocado mas não é o usuário atual → lock */}
        {essay.status === 'awaiting_second' && currentUserId && essay.second_corrector_id && essay.second_corrector_id !== currentUserId && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-950/40">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              🔒 Esta redação está reservada para segunda correção por{' '}
              <span className="font-bold">{essay.second_corrector_name || 'outro corretor'}</span>.
              Você não pode corrigi-la agora.
            </p>
            <Link
              href={`/partners/${slug}/redacoes`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para a fila
            </Link>
          </div>
        )}

        {/* Banner: este usuário é o segundo corretor alocado */}
        {essay.status === 'awaiting_second' && currentUserId && essay.second_corrector_id === currentUserId && (
          <div className="rounded-2xl border border-amber-400/50 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/40">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              📋 Você foi solicitado(a)
              {essay.second_correction_requested_by_name ? ` por ${essay.second_correction_requested_by_name}` : ''} para realizar a{' '}
              <span className="font-bold">segunda correção</span> desta redação.
            </p>
          </div>
        )}

        {essay.signed_image_url && (
          <details className="rounded-xl border border-slate-200 dark:border-slate-800">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 select-none">
              Ver redação manuscrita original
            </summary>
            <div className="p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={essay.signed_image_url}
                alt="Redação manuscrita original"
                className="max-w-full rounded-lg border border-slate-200 dark:border-slate-800"
              />
            </div>
          </details>
        )}

        <div className={cn('grid grid-cols-1 gap-4', showCompetencyPanel ? 'lg:grid-cols-5' : 'lg:grid-cols-1')}>
          <ElevatedCard
            accentColor={org.brand_primary}
            className={cn('p-4', showCompetencyPanel ? 'lg:col-span-3' : 'lg:col-span-1')}
          >
            <SectionTitle
              title="Texto do aluno"
              hex={org.brand_primary}
              action={
                <div className="flex items-center gap-2">
                  {!showCompetencyPanel && (
                    <button
                      type="button"
                      onClick={() => setShowCompetencyPanel(true)}
                      className="hidden lg:inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Mostrar lateral
                    </button>
                  )}
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      essay.status === 'pending' && 'border border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300',
                      essay.status !== 'pending' && 'border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300',
                    )}
                  >
                    {essay.status === 'pending' ? 'Pendente' : 'Já corrigida'}
                  </span>
                </div>
              }
            />

            <div
              ref={textContainerRef}
              onMouseUp={handleTextMouseUp}
              onTouchEnd={() => setTimeout(handleTextMouseUp, 50)}
              className="max-h-[540px] overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap [-webkit-touch-callout:none] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              {renderAnnotatedText()}
            </div>

            {annotationPopup && selectedText && createPortal(
              <div
                className="fixed z-50 w-72 rounded-xl border border-slate-300 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                style={{ top: annotationPopup.y, left: annotationPopup.x, transform: 'translateX(-50%)' }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Trecho selecionado:{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      &quot;{selectedText.text.slice(0, 40)}
                      {selectedText.text.length > 40 ? '...' : ''}
                      &quot;
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={closePopup}
                    className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {!popupMode ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPopupMode('comment')}
                      className="flex-1 rounded-lg border border-amber-400/60 bg-amber-100 px-2 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Comentar
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPopupMode('correction')}
                      className="flex-1 rounded-lg border border-emerald-400/60 bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <PencilLine className="h-3.5 w-3.5" />
                        Corrigir
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={popupValue}
                      onChange={(e) => setPopupValue(e.target.value)}
                      placeholder={popupMode === 'comment' ? 'Digite o comentário...' : 'Digite a correção...'}
                      className="min-h-[88px] w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPopupMode(null);
                          setPopupValue('');
                        }}
                        className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={addAnnotation}
                        className="rounded-md bg-[var(--brand-primary)] px-2 py-1 text-xs font-semibold text-white"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>,
              document.body,
            )}

            <div className="mt-4 space-y-2 rounded-xl border border-[color:color-mix(in_srgb,var(--brand-secondary)_18%,transparent)] bg-[color:color-mix(in_srgb,var(--brand-secondary)_6%,white)] p-3 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Anotações adicionadas ({annotations.length})
              </h3>
              {annotations.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma anotação adicionada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <button
                        type="button"
                        onClick={() => scrollToAnnotation(ann.id)}
                        className="min-w-0 text-left text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                      >
                        <span className="font-semibold">{ann.type === 'comment' ? 'Comentário' : 'Correção'}</span>
                        {' · '}
                        {(ann.original_text || '').slice(0, 15)}
                        {(ann.original_text || '').length > 15 ? '...' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAnnotation(ann.id)}
                        className="rounded-md border border-rose-500/40 px-2 py-0.5 text-xs text-rose-300 transition hover:bg-rose-500/10"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ElevatedCard>

          {showCompetencyPanel && (
            <ElevatedCard
              accentColor={secondaryAccent.hex ?? undefined}
              className="h-fit p-4 lg:sticky lg:top-4 lg:col-span-2"
            >
              <SectionTitle
                title="Notas por Competência"
                hex={secondaryAccent.hex ?? undefined}
                colorVar={secondaryAccent.cssVar}
                action={
                  // Colapsar a lateral só faz sentido no grid de 2 colunas do
                  // desktop — no mobile ela já aparece empilhada abaixo do
                  // texto, então esconder o botão evita um toggle sem efeito
                  // visível.
                  <button
                    type="button"
                    onClick={() => setShowCompetencyPanel(false)}
                    className="hidden items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 lg:inline-flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    Ocultar lateral
                  </button>
                }
              />
              {competencyPanelContent}
            </ElevatedCard>
          )}
        </div>

        {!showCompetencyPanel && (
          <ElevatedCard accentColor={secondaryAccent.hex ?? undefined} className="p-4">
            <SectionTitle
              title="Notas por Competência (abaixo)"
              hex={secondaryAccent.hex ?? undefined}
              colorVar={secondaryAccent.cssVar}
              action={
                <button
                  type="button"
                  onClick={() => setShowCompetencyPanel(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Mostrar na lateral
                </button>
              }
            />
            {competencyPanelContent}
          </ElevatedCard>
        )}

        <p className="px-1 text-xs text-slate-400 dark:text-slate-500">
          A correção exige nota nas {typeConfig.competencies.length} competências (incluindo 0) e comentário geral com no mínimo 20 caracteres.
        </p>

        {/* Modal de leitura de comentário */}
        {viewingComment && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 sm:items-center sm:pb-0" onClick={() => setViewingComment(null)}>
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">Comentário</h2>
                <button
                  type="button"
                  onClick={() => setViewingComment(null)}
                  className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                &quot;{viewingComment.excerpt}&quot;
              </p>
              <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">{viewingComment.text}</p>
            </div>
          </div>
        )}

        {/* Modal de devolução: "Como deseja devolver esta redação?" */}
        {showDeliveryModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 sm:items-center sm:pb-0" onClick={() => setShowDeliveryModal(false)}>
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">Como deseja devolver esta redação?</h2>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Escolha se quer enviar ao aluno agora ou solicitar uma segunda avaliação.</p>

              {/* Opção A: devolver ao aluno */}
              <button
                type="button"
                onClick={() => {
                  setRequestSecond(false);
                  void doSubmitCorrection({ secondRequest: false, secondCorrectorId: null });
                }}
                disabled={submitting}
                className="mb-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:bg-emerald-50 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Devolver ao aluno agora</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">O aluno receberá esta correção imediatamente.</p>
                </div>
              </button>

              {/* Opção B: solicitar segunda correção */}
              <button
                type="button"
                onClick={() => setRequestSecond(!requestSecond)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition',
                  requestSecond
                    ? 'border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_8%,white)] dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,#1e293b)]'
                    : 'border-slate-200 bg-slate-50 hover:border-[var(--brand-primary)]/50 dark:border-slate-700 dark:bg-slate-800',
                )}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--brand-primary)_15%,white)] dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_20%,#1e293b)]">
                  <Users className="h-4 w-4 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Solicitar segunda correção</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Outro corretor avaliará antes de enviar ao aluno.</p>
                </div>
              </button>

              {/* Painel de seleção do segundo corretor */}
              {requestSecond && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="radio"
                        name="corrector_mode"
                        value="random"
                        checked={secondCorrectorMode === 'random'}
                        onChange={() => { setSecondCorrectorMode('random'); setSelectedCorrectorId(''); }}
                        className="accent-[var(--brand-primary)]"
                      />
                      Corretor aleatório
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="radio"
                        name="corrector_mode"
                        value="specific"
                        checked={secondCorrectorMode === 'specific'}
                        onChange={() => setSecondCorrectorMode('specific')}
                        className="accent-[var(--brand-primary)]"
                      />
                      Escolher corretor
                    </label>
                  </div>

                  {secondCorrectorMode === 'specific' && (
                    <div>
                      {loadingCorrectors ? (
                        <div className="h-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                      ) : correctors.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum outro corretor disponível nesta organização.</p>
                      ) : (
                        <select
                          value={selectedCorrectorId}
                          onChange={(e) => setSelectedCorrectorId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">Selecione um corretor...</option>
                          {correctors.map((c) => (
                            <option key={c.id} value={c.id}>{c.full_name || c.id}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={submitting || (secondCorrectorMode === 'specific' && !selectedCorrectorId)}
                    onClick={() => {
                      void doSubmitCorrection({
                        secondRequest: true,
                        secondCorrectorId: secondCorrectorMode === 'specific' ? selectedCorrectorId : null,
                      });
                    }}
                    className="mt-1 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Users className="h-4 w-4" />
                    {submitting ? 'Enviando...' : 'Confirmar segunda correção'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</p>
              <p className={cn('text-lg font-extrabold', getTotalColorClass(totalScore, typeConfig.total_max))}>{totalScore} / {typeConfig.total_max}</p>
            </div>
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={!canSubmit}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Enviando...' : (essay.status === 'awaiting_second' ? 'Enviar 2ª Correção' : 'Enviar Correção')}
            </button>
          </div>
        </div>
      </div>
    </PartnerLayout>
  );
}
