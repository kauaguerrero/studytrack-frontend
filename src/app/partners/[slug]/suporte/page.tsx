'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { LifeBuoy, Search, BookOpen, MessageSquare, Mail, ChevronRight, ChevronDown } from 'lucide-react';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { useOrg } from '@/contexts/OrgContext';
import { Badge } from '@/components/ui/badge';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, SectionTitle, BrandHero, HERO_ACCENT_COLOR,
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
const SUPPORT_EMAIL_TO = 'igorsilvacruz284@gmail.com';
const SUPPORT_EMAIL_SUBJECT = encodeURIComponent('Suporte StudyTrack');
const SUPPORT_EMAIL_BODY = encodeURIComponent(
  'Olá, equipe StudyTrack!\n\nPreciso de ajuda com:\n\n[Descreva aqui sua dúvida, problema técnico ou solicitação]\n\nMeus dados (opcional):\n- Nome:\n- E-mail da conta:\n\nObrigado(a)!'
);
const SUPPORT_GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL_TO}&su=${SUPPORT_EMAIL_SUBJECT}&body=${SUPPORT_EMAIL_BODY}`;
const KB_LINK = '/portal/support/kb';

const PARTNER_FAQS: never[] = [];

export default function SuportePage() {
  const { org } = useOrg();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFaqs = useMemo(() => PARTNER_FAQS, []);

  // suppress unused var warnings
  void expandedIndex;
  void setExpandedIndex;

  return (
    <ModuleGuard permKey="suporte_enabled">
    <PartnerLayout variant="founder">
      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <RevealGroup className="edificar-page-frame p-3 md:p-4">

          {/* Hero */}
          <RevealItem className="mb-4 lg:mb-5">
            <BrandHero>
              <div className="mx-auto max-w-2xl text-center">
                <Badge className="border-0 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                  <LifeBuoy className="mr-1.5 inline-block h-3.5 w-3.5" style={{ color: HERO_ACCENT_COLOR }} />
                  Central de Ajuda
                </Badge>

                <h1 className="font-display mt-3 text-[28px] font-black text-white lg:text-[36px]">
                  Ajuda e Suporte
                </h1>

                <p className="mt-1 text-[13px] text-white/60">
                  Encontre respostas rápidas ou fale com nossa equipe.
                </p>

                {/* Search bar */}
                <div className="mx-auto mt-5 max-w-xl">
                  <div className="flex items-center rounded-2xl border border-white/10 bg-white px-4 py-1 shadow-xl transition-all focus-within:border-white/30 dark:bg-slate-900">
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

          {/* Action cards */}
          <RevealItem className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 lg:gap-4">

            {/* Card 1 — Manual da Plataforma */}
            <Link href={KB_LINK} className="block h-full">
              <ElevatedCard accentColor="var(--brand-primary)" className="group h-full">
                <div className="flex h-full flex-col items-center gap-3 p-5 text-center">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                    style={{
                      background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                      color: readableBrandText(org.brand_primary, 'var(--brand-primary)', 46),
                    }}
                  >
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-50">Manual da Plataforma</h3>
                    <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Guias passo a passo de todos os recursos.
                    </p>
                  </div>
                </div>
              </ElevatedCard>
            </Link>

            {/* Card 2 — Suporte via WhatsApp */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const number = getNextWhatsAppNumber(org.slug);
                window.open(`https://wa.me/${number}?text=${SUPPORT_WHATSAPP_TEXT}`, '_blank', 'noopener,noreferrer');
              }}
              className="block h-full"
            >
              <ElevatedCard accentColor="#10b981" className="group h-full">
                <div className="flex h-full flex-col items-center gap-3 p-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-50">Suporte via WhatsApp</h3>
                    <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Fale diretamente com nossa equipe.
                    </p>
                  </div>
                </div>
              </ElevatedCard>
            </a>

            {/* Card 3 — E-mail de Suporte */}
            <a
              href={SUPPORT_GMAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full"
            >
              <ElevatedCard accentColor="#a855f7" className="group h-full">
                <div className="flex h-full flex-col items-center gap-3 p-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-110 dark:bg-purple-900/40 dark:text-purple-400">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-50">E-mail de Suporte</h3>
                    <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Abra um ticket para o time de suporte.
                    </p>
                  </div>
                </div>
              </ElevatedCard>
            </a>
          </RevealItem>

          {/* FAQ section */}
          <RevealItem>
            <ElevatedCard accentColor="var(--brand-secondary)" className="edificar-major-surface">
              <div className="p-5">
                <SectionTitle
                  kicker="Ajuda"
                  title="Dúvidas Frequentes"
                  hex={org.brand_secondary}
                />

                {filteredFaqs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
                    <Search className="mx-auto mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" />
                    <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300">
                      Nenhuma dúvida frequente cadastrada ainda.
                    </p>
                    <p className="mt-1 text-[11.5px] text-slate-400 dark:text-slate-500">
                      Em breve novas perguntas serão adicionadas aqui.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {filteredFaqs.map((_, idx) => {
                      const isExpanded = expandedIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="overflow-hidden rounded-xl bg-slate-50 transition-all hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                            className="flex w-full items-start justify-between gap-4 p-4 text-left"
                          >
                            <div className="min-w-0 flex-1 pr-4">
                              <Badge variant="secondary" className="mb-1.5 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                categoria
                              </Badge>
                              <p className="text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-50">
                                pergunta
                              </p>
                            </div>
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                                isExpanded ? '' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              }`}
                              style={isExpanded
                                ? { background: 'var(--brand-secondary)', color: onBrandText(org.brand_secondary) }
                                : undefined}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ElevatedCard>
          </RevealItem>

        </RevealGroup>
      </div>
    </PartnerLayout>
    </ModuleGuard>
  );
}
