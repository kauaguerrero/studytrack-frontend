"use client";

import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { User, TrendingUp, Clock, Map as MapIcon, ListChecks, Compass, Sparkles } from "lucide-react";
import { individualReport } from "./mockData";
import { reportColors } from "./reportTheme";
import { TierBadge } from "./TierBadge";
import {
  ReportCard,
  ReportSectionTitle,
  KpiTile,
  HBar,
  HighlightBox,
  SummaryBox,
  InsightCallout,
  ReportWordmark,
  TableScroll,
} from "./ReportPrimitives";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

function timeToSeconds(t: string) {
  const m = t.match(/(\d+)min(\d+)s/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function IndividualReportShowcase() {
  const r = individualReport;
  const maxTime = Math.max(...r.time.byArea.map((t) => timeToSeconds(t.time)));

  return (
    <section className="py-10 sm:py-14 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div {...fadeUp} className="text-center mb-8">
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-3">
            Relatório 2 de 2
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A2E] tracking-tight mb-4">
            O Relatório Individual do Aluno
          </h2>
          <p className="text-lg text-[#4A5568] max-w-2xl mx-auto leading-relaxed">
            O mesmo simulado gera, automaticamente, um relatório personalizado para cada aluno — comparando
            com a turma e com o histórico real dele na plataforma, não só com esta prova.
          </p>
        </motion.div>

        <div className="rounded-3xl p-4 sm:p-8 space-y-4" style={{ background: reportColors.pageBg, border: `1px solid ${reportColors.cardBorder}` }}>
          <motion.div {...fadeUp} className="flex items-center justify-between flex-wrap gap-2 px-1">
            <ReportWordmark />
            <span className="text-xs font-medium" style={{ color: reportColors.textSecondary }}>
              {r.studentName} — {r.examName}
            </span>
          </motion.div>

          {/* KPIs pessoais */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<User className="w-5 h-5 text-[#2563EB]" />}>
                Meu Desempenho no Simulado
              </ReportSectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <KpiTile label="Meu desempenho" value={`${r.kpis.scorePct}%`} />
                <KpiTile label="Acertos" value={`${r.kpis.correct}/${r.kpis.total}`} />
                <KpiTile label="Tempo de prova" value={r.kpis.examTime} />
                <KpiTile label="Tempo médio/questão" value={r.kpis.avgTimePerQuestion} />
                <KpiTile label="Posição na turma" value={`${r.kpis.classPosition.rank}º de ${r.kpis.classPosition.total}`} />
                <KpiTile label="Evolução" value={`+${r.kpis.evolutionPp} p.p.`} sub="vs. seu histórico" />
              </div>
              <HighlightBox tone="info" title="Como você foi?" text={r.howWasIt} />
            </ReportCard>
          </motion.div>

          {/* Meu desempenho x turma */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle>Meu Desempenho em Relação à Turma</ReportSectionTitle>
              {r.vsClass.map((v) => (
                <HBar key={v.label} label={v.label} pct={v.pct} color={v.emphasis ? reportColors.primary : reportColors.neutralBar} emphasis={v.emphasis} />
              ))}
            </ReportCard>
          </motion.div>

          {/* Desempenho por área */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<Sparkles className="w-5 h-5 text-[#2563EB]" />}>
                Meu Desempenho por Área
              </ReportSectionTitle>
              {r.byArea.map((a) => (
                <div key={a.name} className="mb-4 last:mb-0">
                  <HBar
                    label={a.name}
                    pct={a.pct}
                    color={a.tier === "dominio" ? reportColors.success.fill : a.tier === "atencao" ? reportColors.warning.fill : reportColors.critical.fill}
                  />
                  <div className="text-xs -mt-2.5" style={{ color: reportColors.textSecondary }}>
                    {a.questions} questões · Média da turma: {a.classAvg}% · <TierBadge tier={a.tier} className="ml-1" />
                  </div>
                </div>
              ))}
              <InsightCallout icon={<Sparkles className="w-4 h-4" />}>
                O aluno enxerga, sem esperar boletim, exatamente onde já domina e onde precisa focar — e o
                professor vê a mesma coisa, para toda a turma, ao mesmo tempo.
              </InsightCallout>
            </ReportCard>
          </motion.div>

          {/* Pontos fortes / dificuldades + mapa de domínio */}
          <motion.div {...fadeUp} className="grid md:grid-cols-2 gap-4">
            <ReportCard>
              <ReportSectionTitle icon={<span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: reportColors.success.fill }} />}>
                Onde você está indo bem
              </ReportSectionTitle>
              <div className="space-y-2">
                {r.goingWell.map((g) => (
                  <div key={g.label} className="rounded-lg px-3 py-2" style={{ background: reportColors.success.bg, border: `1px solid ${reportColors.success.border}` }}>
                    <div className="font-semibold text-sm" style={{ color: reportColors.success.text }}>{g.label} — {g.pct.toFixed(1)}%</div>
                    <div className="text-xs" style={{ color: reportColors.textMuted }}>{g.note}</div>
                  </div>
                ))}
              </div>
            </ReportCard>
            <ReportCard>
              <ReportSectionTitle icon={<span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: reportColors.critical.fill }} />}>
                Onde você precisa evoluir
              </ReportSectionTitle>
              <div className="space-y-2">
                {r.needsWork.map((g) => (
                  <div key={g.label} className="rounded-lg px-3 py-2" style={{ background: reportColors.critical.bg, border: `1px solid ${reportColors.critical.border}` }}>
                    <div className="font-semibold text-sm" style={{ color: reportColors.critical.text }}>{g.label} — {g.pct.toFixed(1)}%</div>
                    <div className="text-xs" style={{ color: reportColors.textMuted }}>{g.note}</div>
                  </div>
                ))}
              </div>
            </ReportCard>
          </motion.div>

          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<MapIcon className="w-5 h-5 text-[#2563EB]" />}>Mapa de Domínio</ReportSectionTitle>
              <p className="text-xs mb-3" style={{ color: reportColors.textSecondary }}>
                O que o aluno já sabe × o que ainda precisa aprender, baseado no histórico completo dele na plataforma — não só nesta prova.
              </p>
              <TableScroll>
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr style={{ background: reportColors.tableHeaderBg }}>
                      {["Disciplina", "Conteúdo", "Desempenho", "Diagnóstico"].map((h) => (
                        <th key={h} className="text-left font-semibold px-3 py-2" style={{ color: reportColors.textMuted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.masteryMap.map((row) => (
                      <tr key={row.content} className="border-t" style={{ borderColor: reportColors.rowDivider }}>
                        <td className="px-3 py-2 font-medium" style={{ color: reportColors.ink }}>{row.discipline}</td>
                        <td className="px-3 py-2" style={{ color: reportColors.textMuted }}>{row.content}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: reportColors.ink }}>{row.pct.toFixed(1)}% ({row.questions}q)</td>
                        <td className="px-3 py-2"><TierBadge tier={row.tier} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </ReportCard>
          </motion.div>

          {/* Questões para revisar */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<ListChecks className="w-5 h-5 text-[#EF4444]" />}>Questões para revisar</ReportSectionTitle>
              <div className="space-y-3">
                {r.questionsToReview.map((q) => (
                  <div key={q.code} className="rounded-lg px-3 py-2.5" style={{ background: reportColors.critical.bg, border: `1px solid ${reportColors.critical.border}` }}>
                    <div className="font-semibold text-sm" style={{ color: reportColors.critical.text }}>
                      {q.code} — {q.discipline} · {q.topic}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: reportColors.ink }}>
                      Marcou {q.marked}, a correta era {q.correct}
                    </div>
                    {q.note && <div className="text-xs mt-1 italic" style={{ color: reportColors.textMuted }}>{q.note}</div>}
                  </div>
                ))}
              </div>
            </ReportCard>
          </motion.div>

          {/* Gestão do tempo */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<Clock className="w-5 h-5 text-[#2563EB]" />}>Sua Gestão do Tempo</ReportSectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <KpiTile label="Tempo total" value={r.time.total} />
                <KpiTile label="Tempo médio/questão" value={r.time.avgPerQuestion} />
                <KpiTile label="Questão mais rápida" value={r.time.fastest.code} sub={r.time.fastest.time} />
                <KpiTile label="Questão mais lenta" value={r.time.slowest.code} sub={r.time.slowest.time} />
              </div>
              {r.time.byArea.map((t) => (
                <HBar key={t.name} label={t.name} pct={(timeToSeconds(t.time) / maxTime) * 100} valueLabel={t.time} color={reportColors.neutralBar} />
              ))}
            </ReportCard>
          </motion.div>

          {/* Evolução */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<TrendingUp className="w-5 h-5 text-[#2563EB]" />}>Sua Evolução</ReportSectionTitle>
              <p className="text-xs mb-3" style={{ color: reportColors.textSecondary }}>
                Desempenho histórico no banco de questões da plataforma, mês a mês.
              </p>
              <div className="h-56 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.evolution} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={reportColors.rowDivider} vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: reportColors.textSecondary }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: reportColors.textSecondary }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Acerto"]}
                      contentStyle={{ borderRadius: 8, border: `1px solid ${reportColors.cardBorder}`, fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="pct" stroke={reportColors.ink} strokeWidth={2.5} dot={{ r: 4, fill: reportColors.ink }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <InsightCallout icon={<TrendingUp className="w-4 h-4" />}>
                +{r.raioX.historicalEvolutionPp} p.p. de evolução real, medida automaticamente — sem precisar comparar prova antiga com prova nova à mão.
              </InsightCallout>
            </ReportCard>
          </motion.div>

          {/* Plano de ação + raio-x + síntese */}
          <motion.div {...fadeUp} className="space-y-4">
            <ReportCard>
              <ReportSectionTitle icon={<Compass className="w-5 h-5 text-[#2563EB]" />}>Seu Plano de Ação</ReportSectionTitle>
              <div className="space-y-3">
                {r.actionPlan.map((a) => (
                  <div key={a.title} className="pl-4 border-l-4" style={{ borderColor: reportColors.primary }}>
                    <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: reportColors.primary }}>{a.title}</div>
                    <p className="text-sm" style={{ color: reportColors.textMuted }}>{a.text}</p>
                  </div>
                ))}
              </div>
            </ReportCard>
            <ReportCard>
              <ReportSectionTitle>Seu raio-x</ReportSectionTitle>
              <dl className="text-sm divide-y" style={{ borderColor: reportColors.rowDivider }}>
                {[
                  ["Seu melhor ponto (nesta prova)", `${r.raioX.bestPoint.label} — ${r.raioX.bestPoint.pct}%`],
                  ["Sua principal dificuldade (nesta prova)", `${r.raioX.mainDifficulty.label} — ${r.raioX.mainDifficulty.pct}%`],
                  ["Seu maior alerta (histórico completo)", `${r.raioX.biggestAlert.label} — ${r.raioX.biggestAlert.pct}%`],
                  ["Sua evolução histórica", `+${r.raioX.historicalEvolutionPp} p.p.`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 gap-4">
                    <dt style={{ color: reportColors.textMuted }}>{k}</dt>
                    <dd className="font-bold text-right" style={{ color: reportColors.ink }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </ReportCard>
            <SummaryBox kicker="Em síntese" text={r.summary} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
