'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { LifeBuoy, Search, BookOpen, MessageSquare, Mail, ChevronRight, ChevronDown } from 'lucide-react';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { useOrg } from '@/contexts/OrgContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const [hoveredCard, setHoveredCard] = useState<'kb' | null>(null);

  const filteredFaqs = useMemo(() => PARTNER_FAQS, []);

  // suppress unused var warnings
  void expandedIndex;
  void setExpandedIndex;

  return (
    <PartnerLayout variant="founder">
      <div className="min-h-full bg-[#F4F7FA] dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-50 -m-4 md:-m-8 pb-16">

        {/* Hero */}
        <div
          className="relative pt-12 pb-24 px-4 md:px-8"
          style={{ background: 'var(--brand-primary)' }}
        >
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative max-w-5xl mx-auto text-center z-10 space-y-4">
            <Badge className="bg-white/20 text-white border-0 px-4 py-1.5 text-xs font-bold tracking-wide uppercase">
              <LifeBuoy className="w-4 h-4 mr-2 inline-block" />
              Central de Ajuda
            </Badge>

            <h1 className="text-white font-extrabold text-3xl md:text-4xl tracking-tight">
              Ajuda e Suporte
            </h1>

            <p className="text-white/70 text-lg">
              Encontre respostas rápidas ou fale com nossa equipe.
            </p>

            {/* Search bar */}
            <div className="max-w-xl mx-auto mt-6">
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-2 border-transparent focus-within:border-white/30 px-4 py-1 transition-all">
                <Search className="text-slate-400 h-5 w-5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Qual é a sua dúvida hoje?"
                  className="w-full bg-transparent border-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 py-3 focus:outline-none focus:ring-0 text-base font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="shrink-0 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto w-full p-4 md:p-8 -mt-12 relative z-20 space-y-8">

          {/* Action cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Card 1 — Manual da Plataforma */}
            <Link href={KB_LINK} className="block">
              <Card
                className="rounded-2xl hover:shadow-lg transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group h-full cursor-pointer"
                style={hoveredCard === 'kb' ? { borderColor: 'var(--brand-primary)' } : undefined}
                onMouseEnter={() => setHoveredCard('kb')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4 h-full">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{
                      background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                      color: 'var(--brand-primary)',
                    }}
                  >
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">Manual da Plataforma</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                      Guias passo a passo de todos os recursos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Card 2 — Suporte via WhatsApp */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const number = getNextWhatsAppNumber(org.slug);
                window.open(`https://wa.me/${number}?text=${SUPPORT_WHATSAPP_TEXT}`, '_blank', 'noopener,noreferrer');
              }}
              className="block"
            >
              <Card className="rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group h-full cursor-pointer">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4 h-full">
                  <div className="h-14 w-14 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <MessageSquare className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">Suporte via WhatsApp</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                      Fale diretamente com nossa equipe.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </a>

            {/* Card 3 — E-mail de Suporte */}
            <a
              href={SUPPORT_GMAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="rounded-2xl hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group h-full cursor-pointer">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4 h-full">
                  <div className="h-14 w-14 bg-purple-50 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <Mail className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">E-mail de Suporte</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                      Abra um ticket para o time de suporte.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </a>
          </div>

          {/* FAQ section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <LifeBuoy className="text-blue-600 dark:text-blue-400 h-6 w-6" />
              Dúvidas Frequentes
            </h2>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Search className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="font-bold text-slate-600 dark:text-slate-300">
                  Nenhuma dúvida frequente cadastrada ainda.
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                  Em breve novas perguntas serão adicionadas aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map((_, idx) => {
                  const isExpanded = expandedIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        className="w-full p-5 flex justify-between items-start gap-4 text-left"
                      >
                        <div className="pr-4 flex-1 min-w-0">
                          <Badge variant="secondary" className="mb-2 text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                            categoria
                          </Badge>
                          <p className="text-base font-bold text-slate-800 dark:text-slate-50 leading-snug">
                            pergunta
                          </p>
                        </div>
                        <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </PartnerLayout>
  );
}
