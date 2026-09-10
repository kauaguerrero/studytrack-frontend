"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  AlertTriangle,
  Clock,
  Target,
  BarChart3,
  Users2,
  Siren,
  Layers,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { classReport } from "./mockData";
import { reportColors } from "./reportTheme";
import { TierBadge } from "./TierBadge";
import {
  ReportCard,
  ReportSectionTitle,
  KpiTile,
  HBar,
  StackedBar,
  HighlightBox,
  InfoNote,
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

export function ClassReportShowcase() {
  const r = classReport;
  const maxGrade = Math.max(...r.gradeDistribution.map((g) => g.students));
  const maxTime = Math.max(...r.timePerDiscipline.map((t) => timeToSeconds(t.time)));

  return (
    <section className="py-10 sm:py-14" style={{ background: "#FAFBFF" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div {...fadeUp} className="text-center mb-8">
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-3">
            Relatório 1 de 2
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A2E] tracking-tight mb-4">
            O Relatório Geral da Turma
          </h2>
          <p className="text-lg text-[#4A5568] max-w-2xl mx-auto leading-relaxed">
            Gerado automaticamente para o founder do cursinho logo depois que a turma termina o simulado —
            sem precisar corrigir, tabular ou cruzar planilha nenhuma.
          </p>
        </motion.div>

        {/* Container que emula o PDF real */}
        <div className="rounded-3xl p-4 sm:p-8 space-y-4" style={{ background: reportColors.pageBg, border: `1px solid ${reportColors.cardBorder}` }}>
          {/* Header do relatório */}
          <motion.div {...fadeUp} className="flex items-center justify-between flex-wrap gap-2 px-1">
            <ReportWordmark />
            <span className="text-xs font-medium" style={{ color: reportColors.textSecondary }}>
              {r.examName} — {r.orgName}
            </span>
          </motion.div>

          {/* Visão Executiva */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<BarChart3 className="w-5 h-5 text-[#2563EB]" />}>
                Visão Executiva
              </ReportSectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <KpiTile label="Participação" value={`${r.kpis.participation.done}/${r.kpis.participation.total}`} sub="alunos concluíram" />
                <KpiTile label="Taxa de participação" value={`${r.kpis.participationRate}%`} />
                <KpiTile label="Acerto médio" value={`${r.kpis.avgScore}%`} sub={`mediana ${r.kpis.medianScore}%`} />
                <KpiTile label="Tempo médio" value={r.kpis.avgTime} />
                <KpiTile label="Questões" value={String(r.kpis.questionCount)} />
                <KpiTile label="Melhor resultado" value={`${r.kpis.bestScore}%`} sub={`pior ${r.kpis.worstScore}%`} />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <HighlightBox
                  tone="success"
                  title="Ponto forte"
                  text={`${r.highlights.strongPoint.discipline} apresentou o melhor desempenho da turma, com ${r.highlights.strongPoint.pct}% de acerto médio.`}
                />
                <HighlightBox
                  tone="critical"
                  title="Principal dificuldade"
                  text={`${r.highlights.mainDifficulty.discipline} apresentou o menor percentual de acertos da turma, com ${r.highlights.mainDifficulty.pct}%.`}
                />
                <HighlightBox
                  tone="warning"
                  title="Atenção"
                  text={`${r.highlights.attentionCount} alunos apresentaram desempenho abaixo do nível esperado da turma.`}
                />
              </div>
              <InsightCallout icon={<Sparkles className="w-4 h-4" />}>
                Isso é o resumo que, sem a StudyTrack, exigiria horas cruzando gabarito e planilha de presença
                à mão — aqui está pronto no minuto em que o último aluno termina a prova.
              </InsightCallout>
            </ReportCard>
          </motion.div>

          {/* Distribuição das notas */}
          <motion.div {...fadeUp} className="grid md:grid-cols-2 gap-4">
            <ReportCard>
              <ReportSectionTitle>Distribuição das notas</ReportSectionTitle>
              {r.gradeDistribution.map((g) => (
                <HBar key={g.range} label={g.range} pct={(g.students / maxGrade) * 100} valueLabel={`${g.students} alunos`} />
              ))}
            </ReportCard>
            <ReportCard>
              <ReportSectionTitle>Números-chave</ReportSectionTitle>
              <dl className="text-sm divide-y" style={{ borderColor: reportColors.rowDivider }}>
                {[
                  ["Média", `${r.keyNumbers.mean}%`],
                  ["Mediana", `${r.keyNumbers.median}%`],
                  ["Melhor resultado", `${r.keyNumbers.best}%`],
                  ["Menor resultado", `${r.keyNumbers.worst}%`],
                  ["Dispersão (desvio padrão)", `${r.keyNumbers.stdDev} p.p.`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2">
                    <dt style={{ color: reportColors.textMuted }}>{k}</dt>
                    <dd className="font-bold" style={{ color: reportColors.ink }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </ReportCard>
          </motion.div>

          {/* Desempenho por disciplina */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<Target className="w-5 h-5 text-[#2563EB]" />}>
                Desempenho por Disciplina e Conteúdo
              </ReportSectionTitle>
              {r.disciplines.map((d) => (
                <HBar key={d.name} label={`${d.name} (${d.questions}q)`} pct={d.pct} />
              ))}
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <HighlightBox tone="success" title="Melhor desempenho" text={`${r.highlights.strongPoint.discipline} — ${r.highlights.strongPoint.pct}%`} />
                <HighlightBox tone="critical" title="Maior dificuldade" text={`${r.highlights.mainDifficulty.discipline} — ${r.highlights.mainDifficulty.pct}%`} />
              </div>
              <div className="mt-4">
                <InfoNote>
                  {r.highlights.mainDifficulty.discipline} foi a principal dificuldade da turma — um sinal que,
                  sem relatório automático, só apareceria semanas depois, na prova seguinte.
                </InfoNote>
              </div>
            </ReportCard>
          </motion.div>

          {/* Mapa de dificuldades */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<AlertTriangle className="w-5 h-5 text-[#EF4444]" />}>
                Mapa de Dificuldades — Conteúdos com Acerto mais Baixo
              </ReportSectionTitle>
              <TableScroll>
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr style={{ background: reportColors.tableHeaderBg }}>
                      {["Disciplina", "Conteúdo", "Acerto", "Nível"].map((h) => (
                        <th key={h} className="text-left font-semibold px-3 py-2" style={{ color: reportColors.textMuted }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.difficultyMap.map((row) => (
                      <tr key={row.content} className="border-t" style={{ borderColor: reportColors.rowDivider }}>
                        <td className="px-3 py-2 font-medium" style={{ color: reportColors.ink }}>{row.discipline}</td>
                        <td className="px-3 py-2" style={{ color: reportColors.textMuted }}>{row.content}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: reportColors.ink }}>{row.pct.toFixed(1)}%</td>
                        <td className="px-3 py-2"><TierBadge tier={row.tier} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
              <InsightCallout icon={<Target className="w-4 h-4" />}>
                O professor sabe exatamente qual conteúdo revisar na próxima aula — não &ldquo;a matéria toda de novo&rdquo;.
              </InsightCallout>
            </ReportCard>
          </motion.div>

          {/* Análise das questões */}
          <motion.div {...fadeUp} className="grid md:grid-cols-2 gap-4">
            <ReportCard>
              <ReportSectionTitle icon={<span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: reportColors.success.fill }} />}>
                Mais acertadas
              </ReportSectionTitle>
              <ul className="text-sm space-y-2">
                {r.mostCorrect.map((q) => (
                  <li key={q.code} className="flex justify-between border-b pb-2 last:border-0" style={{ borderColor: reportColors.rowDivider }}>
                    <span style={{ color: reportColors.textMuted }}>{q.code} · {q.discipline}</span>
                    <span className="font-bold" style={{ color: reportColors.success.text }}>{q.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </ReportCard>
            <ReportCard>
              <ReportSectionTitle icon={<span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: reportColors.critical.fill }} />}>
                Mais erradas
              </ReportSectionTitle>
              <ul className="text-sm space-y-2">
                {r.mostWrong.map((q) => (
                  <li key={q.code} className="flex justify-between border-b pb-2 last:border-0" style={{ borderColor: reportColors.rowDivider }}>
                    <span style={{ color: reportColors.textMuted }}>{q.code} · {q.discipline}</span>
                    <span className="font-bold" style={{ color: reportColors.critical.text }}>{q.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </ReportCard>
          </motion.div>

          {/* Tempo médio por disciplina */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<Clock className="w-5 h-5 text-[#2563EB]" />}>
                Tempo médio por disciplina
              </ReportSectionTitle>
              {r.timePerDiscipline.map((t) => (
                <HBar key={t.name} label={t.name} pct={(timeToSeconds(t.time) / maxTime) * 100} valueLabel={t.time} color={reportColors.neutralBar} />
              ))}
            </ReportCard>
          </motion.div>

          {/* Alunos: destaques e atenção */}
          <motion.div {...fadeUp} className="grid md:grid-cols-2 gap-4">
            <ReportCard>
              <ReportSectionTitle icon={<Trophy className="w-5 h-5 text-[#F59E0B]" />}>Destaques</ReportSectionTitle>
              <ol className="text-sm space-y-2">
                {r.topStudents.map((s, i) => (
                  <li key={s.name} className="flex justify-between border-b pb-2 last:border-0" style={{ borderColor: reportColors.rowDivider }}>
                    <span style={{ color: reportColors.ink }}><span style={{ color: reportColors.textSecondary }}>{i + 1}º</span> {s.name}</span>
                    <span className="font-bold" style={{ color: reportColors.ink }}>{s.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ol>
            </ReportCard>
            <ReportCard>
              <ReportSectionTitle icon={<Siren className="w-5 h-5 text-[#EF4444]" />}>Alunos que demandam atenção</ReportSectionTitle>
              <div className="space-y-2">
                {r.atRiskStudents.map((s) => (
                  <div key={s.name} className="rounded-lg px-3 py-2" style={{ background: reportColors.critical.bg, border: `1px solid ${reportColors.critical.border}` }}>
                    <div className="font-semibold text-sm" style={{ color: reportColors.critical.text }}>{s.name} — {s.pct.toFixed(1)}%</div>
                    <div className="text-xs" style={{ color: reportColors.textMuted }}>
                      {s.gapPp.toFixed(1)} p.p. abaixo da média · principal dificuldade: {s.weakDiscipline}
                    </div>
                  </div>
                ))}
              </div>
              <InsightCallout icon={<Siren className="w-4 h-4" />}>
                Ninguém passa despercebido até o boletim final — a intervenção pode começar essa semana.
              </InsightCallout>
            </ReportCard>
          </motion.div>

          {/* Segmentação */}
          <motion.div {...fadeUp}>
            <ReportCard>
              <ReportSectionTitle icon={<Layers className="w-5 h-5 text-[#2563EB]" />}>
                Segmentação da turma por faixa de desempenho
              </ReportSectionTitle>
              <StackedBar segments={r.segmentation.map((s) => ({ pct: s.pctOfClass, color: s.color, label: s.label }))} />
              <div className="mt-4">
                <TableScroll>
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr style={{ background: reportColors.tableHeaderBg }}>
                        {["Faixa", "Alunos", "% da turma"].map((h) => (
                          <th key={h} className="text-left font-semibold px-3 py-2" style={{ color: reportColors.textMuted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.segmentation.map((s) => (
                        <tr key={s.label} className="border-t" style={{ borderColor: reportColors.rowDivider }}>
                          <td className="px-3 py-2 font-medium flex items-center gap-2" style={{ color: reportColors.ink }}>
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: s.color }} />
                            {s.label}
                          </td>
                          <td className="px-3 py-2" style={{ color: reportColors.textMuted }}>{s.count}</td>
                          <td className="px-3 py-2 font-semibold" style={{ color: reportColors.ink }}>{s.pctOfClass}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            </ReportCard>
          </motion.div>

          {/* Diagnóstico e recomendações */}
          <motion.div {...fadeUp} className="space-y-4">
            <ReportCard>
              <ReportSectionTitle icon={<Stethoscope className="w-5 h-5 text-[#2563EB]" />}>Diagnóstico</ReportSectionTitle>
              <ol className="space-y-3 text-sm">
                {r.diagnostics.map((d, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-bold shrink-0" style={{ color: reportColors.primary }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ color: reportColors.textMuted }}>{d}</span>
                  </li>
                ))}
              </ol>
            </ReportCard>
            <ReportCard>
              <ReportSectionTitle icon={<Users2 className="w-5 h-5 text-[#2563EB]" />}>Recomendações</ReportSectionTitle>
              <div className="space-y-3">
                {r.recommendations.map((rec) => (
                  <div key={rec.title} className="pl-4 border-l-4" style={{ borderColor: reportColors.primary }}>
                    <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: reportColors.primary }}>{rec.title}</div>
                    <p className="text-sm" style={{ color: reportColors.textMuted }}>{rec.text}</p>
                  </div>
                ))}
              </div>
            </ReportCard>
            <SummaryBox kicker="Em uma frase" text={r.summary} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
