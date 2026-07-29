'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Share, SquarePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ensurePushSubscription, isPushSupported, requestAndSubscribe } from '@/lib/push';
import { usePopupQueue } from './gamification/PopupQueueContext';

/**
 * Orquestra os convites de engajamento fora da fila de gamificação:
 *
 * 1. Opt-in de push  — quando Notification.permission === 'default'.
 * 2. Hint de instalação (PWA / tela de início) — quando o app não está
 *    instalado. No Android usa o prompt nativo (beforeinstallprompt);
 *    no iOS mostra instruções (Compartilhar → Adicionar à Tela de Início),
 *    que lá é também o único caminho para push funcionar.
 *
 * Regras de convivência (para não virar poluição):
 * - No MÁXIMO 1 convite por visita — push tem prioridade; o hint de
 *   instalação só aparece em visita na qual o opt-in de push não vai aparecer.
 * - NUNCA por cima de popup de gamificação: renderiza somente com a fila
 *   vazia (currentPopup === null) — se um popup abrir, o convite se esconde
 *   e volta quando a fila esvazia. Por isso este componente vive DENTRO do
 *   PopupQueueProvider (montado no StudentThemeShell).
 * - permission === 'granted' → só re-garante a assinatura, sem UI.
 * - permission === 'denied' → respeita o bloqueio, sem UI.
 * - "Agora não" adia: push por 3 dias, instalação por 7 (localStorage).
 */

const PUSH_SNOOZE_KEY = 'st:push-prompt-snooze-until';
const A2HS_SNOOZE_KEY = 'st:a2hs-hint-snooze-until';
const PUSH_SNOOZE_DAYS = 3;
const A2HS_SNOOZE_DAYS = 7;
const SHOW_DELAY_MS = 2500;

type PromptKind = 'push' | 'a2hs';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isSnoozed(key: string): boolean {
  try {
    const until = window.localStorage.getItem(key);
    return until !== null && Date.now() < Number(until);
  } catch {
    return false;
  }
}

function snooze(key: string, days: number) {
  try {
    window.localStorage.setItem(key, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch {
    // localStorage indisponível — o convite volta na próxima visita
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS moderno se identifica como Mac, mas tem touch
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function PushManager() {
  const { currentPopup } = usePopupQueue();
  const [prompt, setPrompt] = useState<PromptKind | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const deferredInstallRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installReady, setInstallReady] = useState(false);

  // Captura o prompt nativo de instalação do Android/Chrome (só dispara se
  // o app for instalável e ainda não estiver instalado).
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredInstallRef.current = e as BeforeInstallPromptEvent;
      setInstallReady(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  useEffect(() => {
    const pushEligible =
      isPushSupported() && Notification.permission === 'default' && !isSnoozed(PUSH_SNOOZE_KEY);

    if (isPushSupported() && Notification.permission === 'granted') {
      // Já ativou — só mantém a assinatura viva, sem UI.
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        void ensurePushSubscription(session.access_token);
      });
    }

    if (pushEligible) {
      setPrompt('push');
    } else if (!isStandalone() && !isSnoozed(A2HS_SNOOZE_KEY)) {
      // Sem opt-in de push nesta visita → pode oferecer instalação.
      if (isIOS()) {
        setPrompt('a2hs');
      }
      // Android: aguarda o beforeinstallprompt (efeito abaixo).
    }

    const timer = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Android: o beforeinstallprompt pode chegar depois do mount.
  useEffect(() => {
    if (!installReady) return;
    setPrompt((current) => {
      if (current !== null) return current; // push (ou iOS) já ocupa a visita
      if (isStandalone() || isSnoozed(A2HS_SNOOZE_KEY)) return null;
      return 'a2hs';
    });
  }, [installReady]);

  const dismiss = (kind: PromptKind) => {
    snooze(
      kind === 'push' ? PUSH_SNOOZE_KEY : A2HS_SNOOZE_KEY,
      kind === 'push' ? PUSH_SNOOZE_DAYS : A2HS_SNOOZE_DAYS,
    );
    setPrompt(null);
  };

  const handleEnablePush = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const result = await requestAndSubscribe(session.access_token);
      if (result === 'subscribed') {
        toast.success('Notificações ativadas! Vamos te avisar quando sua sequência estiver em risco. 🔥');
      } else if (result !== 'denied') {
        toast.error('Não foi possível ativar as notificações agora.');
      }
      // 'denied': o navegador gravou o bloqueio — some sem insistir.
    } finally {
      setBusy(false);
      setPrompt(null);
    }
  };

  const handleInstall = async () => {
    const deferred = deferredInstallRef.current;
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('App instalado! Agora o StudyTrack está a um toque de você. 🚀');
      } else {
        snooze(A2HS_SNOOZE_KEY, A2HS_SNOOZE_DAYS);
      }
    } catch {
      snooze(A2HS_SNOOZE_KEY, A2HS_SNOOZE_DAYS);
    } finally {
      deferredInstallRef.current = null;
      setBusy(false);
      setPrompt(null);
    }
  };

  // Nunca por cima de popup de gamificação; nunca antes do delay inicial.
  if (!ready || prompt === null || currentPopup !== null) return null;

  const ios = prompt === 'a2hs' && isIOS();

  return (
    <div
      className="fixed inset-x-3 bottom-20 z-[9000] mx-auto max-w-md sm:inset-x-auto sm:right-6 sm:bottom-6"
      role="dialog"
      aria-label={prompt === 'push' ? 'Ativar notificações' : 'Instalar o app'}
    >
      <div className="flex items-start gap-3 rounded-2xl bg-slate-900 p-4 shadow-2xl ring-1 ring-white/10">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15">
          {prompt === 'push' ? (
            <Bell className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <SquarePlus className="h-4.5 w-4.5 text-amber-400" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          {prompt === 'push' ? (
            <>
              <p className="text-[13.5px] font-bold leading-snug text-white">
                Não perca sua sequência 🔥
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">
                Ative as notificações e a gente te avisa quando sua ofensiva
                estiver em risco e quando sua redação for corrigida.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleEnablePush}
                  disabled={busy}
                  className="rounded-xl bg-amber-400 px-4 py-2 text-[12.5px] font-black text-slate-900 transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60"
                >
                  {busy ? 'Ativando…' : 'Ativar notificações'}
                </button>
                <button
                  onClick={() => dismiss('push')}
                  className="rounded-xl px-3 py-2 text-[12.5px] font-bold text-white/50 transition-colors hover:text-white/80"
                >
                  Agora não
                </button>
              </div>
            </>
          ) : ios ? (
            <>
              <p className="text-[13.5px] font-bold leading-snug text-white">
                Leve o StudyTrack no bolso 📲
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">
                Toque em <Share className="inline h-3.5 w-3.5 align-[-2px]" aria-label="Compartilhar" />{' '}
                <strong className="text-white/80">Compartilhar</strong> e depois em{' '}
                <strong className="text-white/80">&quot;Adicionar à Tela de Início&quot;</strong>.
                Assim o app abre em um toque — e as notificações funcionam no iPhone.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => dismiss('a2hs')}
                  className="rounded-xl bg-white/10 px-4 py-2 text-[12.5px] font-bold text-white/80 transition-colors hover:bg-white/15"
                >
                  Entendi
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13.5px] font-bold leading-snug text-white">
                Leve o StudyTrack no bolso 📲
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">
                Instale o app na tela de início e abra seus estudos em um toque,
                sem digitar nada.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  disabled={busy}
                  className="rounded-xl bg-amber-400 px-4 py-2 text-[12.5px] font-black text-slate-900 transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60"
                >
                  {busy ? 'Abrindo…' : 'Instalar o app'}
                </button>
                <button
                  onClick={() => dismiss('a2hs')}
                  className="rounded-xl px-3 py-2 text-[12.5px] font-bold text-white/50 transition-colors hover:text-white/80"
                >
                  Agora não
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => dismiss(prompt)}
          aria-label="Fechar"
          className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
