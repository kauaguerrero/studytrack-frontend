'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LifeBuoy, Search, MessageSquare, Mail, ChevronRight, ChevronDown, Flag,
} from 'lucide-react';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { useOrg } from '@/contexts/OrgContext';
import { useReportNotification } from '@/contexts/ReportNotificationContext';
import { Badge } from '@/components/ui/badge';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, BrandHero, HERO_ACCENT_COLOR,
} from '@/components/partners/founder-ui';

const WHATSAPP_NUMBERS = ['5516996973320', '5516994045785'];
const SUPPORT_WHATSAPP_TEXT = encodeURIComponent('Olá, preciso de ajuda com a plataforma.');

function getNextWhatsAppNumber(slug: string): string {
  try {
    const key = `${slug}_support_wa_counter`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    const next = (current + 1) % WHATSAPP_NUMBERS.length;
    localStorage.setItem(key, String(next));
    return WHATSAPP_NUMBERS[current];
  } catch {
    return WHATSAPP_NUMBERS[0];
  }
}

const SUPPORT_EMAIL_TO = 'suporte@studytrack.com.br';
const SUPPORT_EMAIL_SUBJECT = encodeURIComponent('Suporte StudyTrack');
const SUPPORT_EMAIL_BODY = encodeURIComponent(
  'Olá, equipe StudyTrack!\n\nPreciso de ajuda com:\n\n[Descreva aqui sua dúvida, problema técnico ou solicitação]\n\nMeus dados (opcional):\n- Nome:\n- E-mail da conta:\n\nObrigado(a)!'
);
const SUPPORT_GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL_TO}&su=${SUPPORT_EMAIL_SUBJECT}&body=${SUPPORT_EMAIL_BODY}`;

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

const PARTNER_FAQS: FaqItem[] = [
  {
    category: 'Sequência',
    question: 'Como funciona a sequência de dias (streak)?',
    answer: 'Toda vez que você responde uma questão ou conclui um simulado, sua sequência avança um dia. Sábado e domingo não quebram a sequência — você pode descansar no fim de semana sem perder o progresso. Se ficar um dia útil sem estudar, a sequência reseta, a menos que você use um escudo de proteção.',
  },
  {
    category: 'Sequência',
    question: 'O que é o escudo de proteção da sequência?',
    answer: 'É um item que salva sua sequência caso você perca um dia. Você ganha um escudo automaticamente ao manter uma sequência ativa por 7 dias seguidos. Ele é usado automaticamente (ou você pode escolher usá-lo) quando sua sequência estaria prestes a quebrar.',
  },
  {
    category: 'Pontuação',
    question: 'Como ganho pontos e subo no ranking?',
    answer: 'Você ganha pontos ao acertar questões (na primeira tentativa), concluir simulados e enviar redações. Esses pontos valem para o ranking mensal da sua turma, que reseta todo início de mês. Já o seu Nível de conta é permanente: o XP dele nunca reseta.',
  },
  {
    category: 'Redação',
    question: 'Quanto tempo leva para minha redação ser corrigida?',
    answer: 'O prazo depende do seu cursinho, mas você recebe uma notificação assim que a correção do professor fica disponível. Você pode acompanhar o status (pendente, corrigida, vista) na aba Redações.',
  },
  {
    category: 'Conta',
    question: 'Esqueci minha senha, como recupero o acesso?',
    answer: 'Na tela de login, clique em "Esqueci minha senha" e siga as instruções enviadas para o seu e-mail cadastrado. Se você não tiver mais acesso a esse e-mail, fale com o suporte do seu cursinho.',
  },
  {
    category: 'Notificações',
    question: 'Como ativo notificações no celular ou computador?',
    answer: 'Vá em Perfil → Preferências e ative "Notificações Push". Você também pode instalar o StudyTrack como aplicativo na tela de início do seu celular para uma experiência mais rápida.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentSuportePage() {
  const { org } = useOrg();
  const { hasUnseenResolved } = useReportNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return PARTNER_FAQS;
    return PARTNER_FAQS.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.category.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  return (
    <ModuleGuard permKey="suporte_enabled">
      <div className="min-h-full bg-[#F4F7FA] dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-50 -m-4 md:-m-8 pb-16">
        <RevealGroup>

          {/* Hero */}
          <RevealItem className="relative px-4 pb-24 pt-8 md:px-8">
            <BrandHero>
              <div className="relative z-10 mx-auto max-w-3xl space-y-4 text-center">
                <Badge className="border-0 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                  <LifeBuoy className="mr-2 inline-block h-4 w-4" style={{ color: HERO_ACCENT_COLOR }} />
                  Central de Ajuda
                </Badge>
                <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">
                  Ajuda e Suporte
                </h1>
                <p className="text-lg text-white/60">
                  Encontre respostas rápidas ou fale com nossa equipe.
                </p>
                <div className="mx-auto mt-6 max-w-xl">
                  <div className="flex items-center rounded-2xl border-2 border-transparent bg-white px-4 py-1 shadow-xl transition-all focus-within:border-white/30 dark:bg-slate-900">
                    <Search className="h-5 w-5 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Qual é a sua dúvida hoje?"
                      className="w-full border-0 bg-transparent px-4 py-3 text-base font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="shrink-0 rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </BrandHero>
          </RevealItem>

          {/* Content */}
          <div className="relative z-20 mx-auto -mt-12 w-full max-w-5xl space-y-5 p-4 md:p-8">

            {/* Action cards — 3 em linha */}
            <RevealItem className="grid grid-cols-1 gap-5 sm:grid-cols-3">

              {/* Card 1 — WhatsApp */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const number = getNextWhatsAppNumber(org.slug);
                  window.open(`https://wa.me/${number}?text=${SUPPORT_WHATSAPP_TEXT}`, '_blank', 'noopener,noreferrer');
                }}
                className="block"
              >
                <ElevatedCard accentColor="#10b981" className="group h-full cursor-pointer">
                  <div className="flex h-full flex-col items-center space-y-4 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-900/40 dark:text-emerald-400">
                      <MessageSquare className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">Suporte via WhatsApp</h3>
                      <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Fale diretamente com nossa equipe.
                      </p>
                    </div>
                  </div>
                </ElevatedCard>
              </a>

              {/* Card 2 — E-mail */}
              <a href={SUPPORT_GMAIL_URL} target="_blank" rel="noopener noreferrer" className="block">
                <ElevatedCard accentColor="#a855f7" className="group h-full cursor-pointer">
                  <div className="flex h-full flex-col items-center space-y-4 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-110 dark:bg-purple-900/40 dark:text-purple-400">
                      <Mail className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">E-mail de Suporte</h3>
                      <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Abra um ticket para o time de suporte.
                      </p>
                    </div>
                  </div>
                </ElevatedCard>
              </a>

              {/* Card 3 — Meus Reports (link para página dedicada) */}
              <Link href={`/partners/${org.slug}/student/suporte/reports`} className="block">
                <ElevatedCard accentColor="#f59e0b" className="group h-full cursor-pointer relative">
                  {hasUnseenResolved && (
                    <span className="absolute top-3 right-3 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  )}
                  <div className="flex h-full flex-col items-center space-y-4 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110 dark:bg-amber-900/40 dark:text-amber-400">
                      <Flag className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">Meus Reports</h3>
                      <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Acompanhe questões reportadas.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <ChevronDown className="h-4 w-4" /> Ver detalhes
                    </div>
                  </div>
                </ElevatedCard>
              </Link>
            </RevealItem>

            {/* FAQ */}
            <RevealItem className="space-y-3">
              <h2 className="font-display flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-50">
                <LifeBuoy className="h-6 w-6" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)') }} />
                Dúvidas Frequentes
              </h2>

              {filteredFaqs.length === 0 ? (
                <ElevatedCard>
                  <div className="py-12 text-center">
                    <Search className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">Nenhuma dúvida encontrada.</p>
                    <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Tente outras palavras ou entre em contato com nossa equipe.</p>
                  </div>
                </ElevatedCard>
              ) : (
                <div className="space-y-3">
                  {filteredFaqs.map((faq, idx) => {
                    const isExpanded = expandedIndex === idx;
                    return (
                      <ElevatedCard key={faq.question}>
                        <button
                          type="button"
                          onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                          className="flex w-full items-start justify-between gap-4 p-5 text-left"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <Badge variant="secondary" className="mb-2 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {faq.category}
                            </Badge>
                            <p className="text-base font-bold leading-snug text-slate-800 dark:text-slate-50">
                              {faq.question}
                            </p>
                          </div>
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
                            style={isExpanded ? { background: 'var(--brand-primary)', color: onBrandText(org.brand_primary) } : undefined}
                          >
                            {isExpanded
                              ? <ChevronDown className="h-5 w-5" />
                              : <ChevronRight className="h-5 w-5 text-slate-400 dark:text-slate-500" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{faq.answer}</p>
                          </div>
                        )}
                      </ElevatedCard>
                    );
                  })}
                </div>
              )}
            </RevealItem>

          </div>
        </RevealGroup>
      </div>
    </ModuleGuard>
  );
}
