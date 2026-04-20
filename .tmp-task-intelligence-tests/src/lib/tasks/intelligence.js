"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaskCompleteness = calculateTaskCompleteness;
exports.calculateStageTimings = calculateStageTimings;
exports.buildTaskSignals = buildTaskSignals;
exports.buildPortfolioSignals = buildPortfolioSignals;
exports.buildDeterministicAIInsight = buildDeterministicAIInsight;
exports.buildDashboardMetrics = buildDashboardMetrics;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
function asText(value) {
    if (value == null)
        return '';
    if (typeof value === 'string')
        return value.trim();
    if (Array.isArray(value))
        return value.filter(Boolean).join(', ').trim();
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value).trim();
}
function asArray(value) {
    if (Array.isArray(value))
        return value.map((item) => asText(item)).filter(Boolean);
    const text = asText(value);
    if (!text)
        return [];
    return text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function isFilled(value) {
    if (value == null)
        return false;
    if (typeof value === 'boolean')
        return true;
    if (typeof value === 'number')
        return true;
    if (Array.isArray(value))
        return value.length > 0;
    return asText(value).length > 0;
}
function safeDate(dateLike) {
    if (!dateLike)
        return null;
    const value = new Date(dateLike);
    return Number.isNaN(value.getTime()) ? null : value;
}
function hoursBetween(start, end = new Date().toISOString()) {
    const startDate = safeDate(start);
    const endDate = safeDate(end);
    if (!startDate || !endDate)
        return 0;
    return Math.max(0, (endDate.getTime() - startDate.getTime()) / HOUR_MS);
}
function median(values) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
}
function average(values) {
    if (!values.length)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function percent(numerator, denominator) {
    if (!denominator)
        return 0;
    return numerator / denominator;
}
function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
}
function formatHours(value) {
    if (value < 24)
        return `${value.toFixed(1)}h`;
    return `${(value / 24).toFixed(1)}d`;
}
function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function buildScore(rules) {
    const total = rules.length || 1;
    const met = rules.filter((rule) => rule.met).length;
    const score = met / total;
    return {
        score,
        percentage: Math.round(score * 100),
        missing_fields: rules.filter((rule) => !rule.met).map((rule) => rule.label),
        rules,
    };
}
function calculateTaskCompleteness(task) {
    const creation = buildScore([
        { id: 'title', label: 'titulo', met: isFilled(task.title) },
        { id: 'problem', label: 'descricao_do_problema', met: isFilled(task.description) || isFilled(task.scope) || isFilled(task.problem_context) },
        { id: 'outcome', label: 'resultado_esperado', met: isFilled(task.expected_outcome) },
        { id: 'acceptance', label: 'criterios_de_aceite', met: isFilled(task.acceptance_criteria) },
        { id: 'priority', label: 'prioridade', met: isFilled(task.priority) },
        { id: 'assignee', label: 'responsavel', met: isFilled(task.assignee_id) },
        { id: 'estimate', label: 'estimativa', met: isFilled(task.estimate_hours) },
        { id: 'dependencies', label: 'dependencias', met: isFilled(task.dependencies) },
        { id: 'type', label: 'tipo', met: isFilled(task.task_type) },
        { id: 'target', label: 'prazo_alvo', met: isFilled(task.target_date) || isFilled(task.deadline) },
    ]);
    const progress = buildScore([
        { id: 'recent_update', label: 'atualizacao_recente', met: hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at, undefined) <= 72 || task.status === 'done' || task.status === 'archived' },
        { id: 'completed_work', label: 'trabalho_concluido', met: isFilled(task.completed_work) || isFilled(task.progress?.already_done) },
        { id: 'remaining_work', label: 'trabalho_restante', met: isFilled(task.remaining_work) || isFilled(task.progress?.remaining) },
        { id: 'next_step', label: 'proximo_passo', met: isFilled(task.next_step) },
        { id: 'blockers', label: 'bloqueios_informados', met: task.status !== 'blocked' || isFilled(task.current_blockers) || isFilled(task.block_reason) },
        { id: 'dependency_updates', label: 'dependencias_atualizadas', met: isFilled(task.dependency_updates) || isFilled(task.dependencies) },
    ]);
    const closure = buildScore([
        { id: 'delivery_summary', label: 'resumo_da_entrega', met: isFilled(task.delivery_summary) || isFilled(task.completion?.summary) },
        { id: 'delivery_evidence', label: 'evidencias', met: isFilled(task.delivery_evidence) || (task.completion?.files_modified_count ?? 0) > 0 },
        { id: 'pending_items', label: 'pendencias', met: isFilled(task.pending_items) },
        { id: 'rework_recorded', label: 'retrabalho_registrado', met: task.had_rework != null || (task.reopened_count ?? 0) > 0 },
        { id: 'delay_recorded', label: 'atraso_registrado', met: task.had_delay != null || isFilled(task.delay_reason) },
        { id: 'impacts', label: 'impactos_ou_desdobramentos', met: isFilled(task.expected_impact) || isFilled(task.delay_reason) },
    ]);
    const consolidated = average([creation.score, progress.score, closure.score]);
    const missingFields = Array.from(new Set([
        ...creation.missing_fields,
        ...progress.missing_fields,
        ...closure.missing_fields,
    ]));
    return {
        creation,
        progress,
        closure,
        consolidated,
        consolidated_percentage: Math.round(consolidated * 100),
        missing_fields: missingFields,
    };
}
function calculateStageTimings(task, now = new Date()) {
    const timings = {
        backlog: 0,
        in_progress: 0,
        review: 0,
        done: 0,
        blocked: 0,
        archived: 0,
    };
    const history = [...(task.history ?? [])]
        .filter((entry) => entry.field_changed === 'status')
        .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    let cursorStatus = 'backlog';
    let cursorTime = safeDate(task.created_at) ?? now;
    for (const entry of history) {
        const changedAt = safeDate(entry.changed_at) ?? cursorTime;
        timings[cursorStatus] += Math.max(0, (changedAt.getTime() - cursorTime.getTime()) / 1000);
        const nextStatus = entry.new_value;
        if (nextStatus) {
            cursorStatus = nextStatus;
            cursorTime = changedAt;
        }
    }
    timings[task.status] += Math.max(0, (now.getTime() - cursorTime.getTime()) / 1000);
    return Object.keys(timings).map((status) => ({
        status,
        seconds: Math.round(timings[status]),
    }));
}
function buildTaskSignals(task, referenceDate = new Date().toISOString()) {
    const signals = [];
    const completeness = calculateTaskCompleteness(task);
    const now = safeDate(referenceDate) ?? new Date();
    const agingHours = hoursBetween(task.created_at, referenceDate);
    const blockedHours = hoursBetween(task.last_blocked_at, referenceDate);
    const progressHours = hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at, referenceDate);
    const createSignal = (type, severity, diagnosis, evidence, suggestion) => {
        signals.push({
            id: `${type}:${task.id}`,
            type,
            severity,
            diagnosis,
            evidence,
            suggestion,
            scope: 'task',
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
        });
    };
    if (completeness.consolidated < 0.6) {
        createSignal('low_task_completeness', completeness.consolidated < 0.4 ? 'high' : 'medium', 'A task está com baixa completude operacional.', [`Score consolidado em ${completeness.consolidated_percentage}%`, `Campos ausentes: ${completeness.missing_fields.join(', ') || 'nenhum'}`], 'Completar os campos ausentes antes de avançar o fluxo.');
    }
    if ((task.priority === 'high' || task.priority === 'critical') && !isFilled(task.acceptance_criteria)) {
        createSignal('high_priority_without_acceptance_criteria', task.priority === 'critical' ? 'critical' : 'high', 'Task de alta prioridade sem critérios de aceite.', [`Prioridade atual: ${task.priority}`, 'Campo acceptance_criteria vazio'], 'Definir critérios de aceite claros para reduzir retrabalho.');
    }
    if (task.status !== 'done' && task.status !== 'archived' && agingHours > 14 * 24) {
        createSignal('task_aging_too_high', agingHours > 21 * 24 ? 'high' : 'medium', 'A task está envelhecendo acima do esperado.', [`Aging atual: ${formatHours(agingHours)}`, `Status atual: ${task.status}`], 'Reavaliar escopo, prioridade e impedimentos da task.');
    }
    if (task.status === 'in_progress' && progressHours > 72) {
        createSignal('in_progress_without_recent_update', progressHours > 120 ? 'high' : 'medium', 'Task em andamento sem atualização recente.', [`Última atualização há ${formatHours(progressHours)}`], 'Registrar progresso, próximo passo e bloqueios atuais.');
    }
    if (task.status === 'blocked' && blockedHours > 48) {
        createSignal('blocked_too_long', blockedHours > 120 ? 'critical' : 'high', 'Task bloqueada por tempo excessivo.', [`Tempo bloqueado atual: ${formatHours(blockedHours)}`, `Motivo: ${asText(task.block_reason) || 'não informado'}`], 'Atuar no desbloqueio imediatamente ou redefinir o plano operacional.');
    }
    if (task.priority === 'critical' && task.status === 'blocked') {
        createSignal('critical_task_blocked', 'critical', 'Task crítica bloqueada.', [`Categoria: ${asText(task.block_category) || 'não informada'}`, `Tempo bloqueado: ${formatHours(blockedHours)}`], 'Escalar o bloqueio e definir owner e prazo de resolução.');
    }
    if ((task.reopened_count ?? 0) > 0) {
        createSignal('done_task_reopened', (task.reopened_count ?? 0) > 1 ? 'high' : 'medium', 'Task concluída já foi reaberta.', [`Quantidade de reaberturas: ${task.reopened_count ?? 0}`, `Última reabertura: ${task.last_reopened_at ?? 'n/d'}`], 'Revisar qualidade da definição e dos critérios de aceite.');
    }
    return signals;
}
function buildPortfolioSignals(tasks, sprints, referenceDate = new Date().toISOString()) {
    const signals = [];
    const now = safeDate(referenceDate) ?? new Date();
    const reviewTasks = tasks.filter((task) => task.status === 'review');
    const wipCount = tasks.filter((task) => ['in_progress', 'review', 'blocked'].includes(task.status)).length;
    const activeAssignees = new Set(tasks.map((task) => task.assignee_id).filter(Boolean)).size || 1;
    const reopenedRate = percent(tasks.filter((task) => (task.reopened_count ?? 0) > 0).length, tasks.length);
    const createSignal = (type, severity, diagnosis, evidence, suggestion, scope) => {
        signals.push({
            id: `${type}:${scope}`,
            type,
            severity,
            diagnosis,
            evidence,
            suggestion,
            scope,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
        });
    };
    if (reviewTasks.length >= 3) {
        createSignal('review_bottleneck', reviewTasks.length >= 6 ? 'high' : 'medium', 'Há gargalo de revisão no fluxo atual.', [`Tasks em review: ${reviewTasks.length}`], 'Rebalancear capacidade de revisão ou quebrar lote de entregas.', 'portfolio');
    }
    if (wipCount > Math.max(5, activeAssignees * 3)) {
        createSignal('wip_too_high', 'high', 'WIP acima do limite operacional esperado.', [`WIP atual: ${wipCount}`, `Responsáveis ativos: ${activeAssignees}`], 'Reduzir trabalho simultâneo antes de puxar novas tasks.', 'portfolio');
    }
    if (reopenedRate >= 0.25) {
        createSignal('rework_above_baseline', reopenedRate >= 0.4 ? 'critical' : 'high', 'Retrabalho acima da linha de base.', [`Taxa de reabertura: ${formatPercent(reopenedRate)}`], 'Revisar definição de pronto, critérios de aceite e revisão técnica.', 'portfolio');
    }
    for (const sprint of sprints) {
        if (!sprint.tasks.length)
            continue;
        const carryOverRate = percent(sprint.tasks.filter((task) => task.status !== 'done' && task.status !== 'archived').length, sprint.tasks.length);
        if (carryOverRate >= 0.35) {
            createSignal('sprint_high_carry_over', carryOverRate >= 0.5 ? 'critical' : 'high', 'Carry-over de sprint acima do desejado.', [`Sprint: ${sprint.goal}`, `Carry-over: ${formatPercent(carryOverRate)}`], 'Revisar capacidade planejada, dependências e critérios de entrada da sprint.', 'sprint');
        }
    }
    return signals;
}
function buildDeterministicAIInsight(tasks, metrics, signals) {
    const criticalSignals = signals.filter((signal) => signal.severity === 'critical');
    const topSignals = criticalSignals.length ? criticalSignals : signals.slice(0, 3);
    const blockedTasks = tasks.filter((task) => task.status === 'blocked');
    const staleTasks = tasks.filter((task) => task.status === 'in_progress' && hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at) > 72);
    const lowCompleteness = tasks
        .map((task) => ({ task, completeness: calculateTaskCompleteness(task) }))
        .filter((item) => item.completeness.consolidated < 0.6);
    const topPriorities = [
        blockedTasks.length ? `${blockedTasks.length} task(s) bloqueadas exigem resolução imediata.` : '',
        staleTasks.length ? `${staleTasks.length} task(s) em andamento sem atualização recente.` : '',
        lowCompleteness.length ? `${lowCompleteness.length} task(s) com baixa completude precisam enriquecimento.` : '',
    ].filter(Boolean);
    const evidence = [
        `Throughput atual: ${metrics.executive_summary.throughput.formatted}`,
        `Block rate: ${metrics.executive_summary.block_rate.formatted}`,
        `Score médio de completude: ${metrics.executive_summary.average_completeness_score.formatted}`,
        ...topSignals.flatMap((signal) => signal.evidence.slice(0, 1)),
    ];
    return {
        title: 'Inteligência Operacional',
        bottleneck: metrics.executive_summary.main_bottleneck,
        evidence,
        probable_impact: blockedTasks.length
            ? 'Bloqueios e baixa completude devem reduzir previsibilidade e aumentar carry-over da sprint.'
            : 'O fluxo está estável, mas a previsibilidade depende de manter o WIP sob controle.',
        recommended_action: topSignals[0]?.suggestion ?? 'Manter revisão semanal de sinais e qualidade das tasks.',
        top_priorities: topPriorities.length ? topPriorities : ['Fluxo operacional sem sinais críticos no momento.'],
        focus_of_week: metrics.executive_summary.weekly_focus,
        task_improvement_suggestions: [
            'Padronizar expected_outcome e acceptance_criteria em tasks high/critical.',
            'Registrar next_step e current_blockers em toda task in_progress.',
            'Encerrar tasks com delivery_summary e delivery_evidence sempre que possível.',
        ],
        next_step_suggestions: [
            blockedTasks.length ? 'Resolver a task crítica bloqueada mais antiga.' : 'Selecionar a próxima task com maior aging.',
            staleTasks.length ? 'Atualizar as tasks sem progresso recente.' : 'Revisar a fila de review para evitar gargalo.',
        ],
        operational_summary: `${tasks.length} tasks monitoradas, ${blockedTasks.length} bloqueadas, ${signals.length} sinais relevantes ativos.`,
        source: 'deterministic',
    };
}
function buildDashboardMetrics(tasks, sprints, referenceDate = new Date().toISOString()) {
    const doneTasks = tasks.filter((task) => task.status === 'done');
    const openTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'archived');
    const blockedTasks = tasks.filter((task) => task.status === 'blocked');
    const reviewTasks = tasks.filter((task) => task.status === 'review');
    const staleTasks = tasks.filter((task) => task.status === 'in_progress' && hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at, referenceDate) > 72);
    const completeness = tasks.map(calculateTaskCompleteness);
    const stageTimings = tasks.flatMap((task) => calculateStageTimings(task));
    const timeInStage = ['backlog', 'in_progress', 'review', 'done', 'blocked', 'archived'].map((status) => ({
        status,
        seconds: Math.round(average(stageTimings
            .filter((entry) => entry.status === status)
            .map((entry) => entry.seconds))),
    }));
    const throughput = doneTasks.length;
    const leadTimes = doneTasks
        .filter((task) => safeDate(task.completed_at))
        .map((task) => hoursBetween(task.created_at, task.completed_at));
    const cycleTimes = doneTasks
        .filter((task) => safeDate(task.started_at) && safeDate(task.completed_at))
        .map((task) => hoursBetween(task.started_at, task.completed_at));
    const agingValues = openTasks.map((task) => hoursBetween(task.created_at, referenceDate));
    const blockedTimes = tasks
        .map((task) => (task.total_blocked_time_seconds ?? 0) / 3600)
        .filter((value) => value > 0);
    const creationScores = completeness.map((item) => item.creation.score);
    const progressScores = completeness.map((item) => item.progress.score);
    const closureScores = completeness.map((item) => item.closure.score);
    const consolidatedScores = completeness.map((item) => item.consolidated);
    const signals = buildPortfolioSignals(tasks, sprints, referenceDate);
    const taskSignals = tasks.flatMap((task) => buildTaskSignals(task, referenceDate));
    const allSignals = [...signals, ...taskSignals];
    const completedOnTime = doneTasks.filter((task) => {
        const target = safeDate(task.target_date ?? task.deadline);
        const completedAt = safeDate(task.completed_at);
        return !target || !completedAt || completedAt.getTime() <= target.getTime();
    }).length;
    const delayedTasks = doneTasks.length - completedOnTime;
    const estimateVsActualValues = doneTasks
        .filter((task) => (task.estimate_hours ?? 0) > 0 && safeDate(task.started_at) && safeDate(task.completed_at))
        .map((task) => hoursBetween(task.started_at, task.completed_at) / Math.max(task.estimate_hours ?? 1, 1));
    const sprintCompletion = sprints.map((sprint) => ({
        sprint_id: sprint.id,
        goal: sprint.goal,
        planned: sprint.tasks.length,
        completed: sprint.tasks.filter((task) => task.status === 'done').length,
        carryOver: sprint.tasks.filter((task) => task.status !== 'done' && task.status !== 'archived').length,
        hadScopeDeviation: sprint.tasks.filter((task) => task.had_scope_deviation === true).length,
        riskScore: average(sprint.tasks.map((task) => {
            const taskCompleteness = calculateTaskCompleteness(task);
            const riskBase = task.status === 'blocked' ? 0.5 : 0;
            const reworkBase = Math.min((task.reopened_count ?? 0) * 0.2, 0.4);
            return Math.min(1, riskBase + reworkBase + (1 - taskCompleteness.consolidated));
        })),
    }));
    const blockCategoriesMap = new Map();
    for (const task of blockedTasks) {
        const category = asText(task.block_category) || 'uncategorized';
        blockCategoriesMap.set(category, (blockCategoriesMap.get(category) ?? 0) + 1);
    }
    const missingFieldsMap = new Map();
    for (const item of completeness) {
        for (const field of item.missing_fields) {
            missingFieldsMap.set(field, (missingFieldsMap.get(field) ?? 0) + 1);
        }
    }
    const mainBottleneck = blockedTasks.length
        ? 'Bloqueios ativos concentrando risco operacional.'
        : reviewTasks.length >= 3
            ? 'Fila de review acima do nível saudável.'
            : 'Baixa completude das tasks reduzindo previsibilidade.';
    const weeklyFocus = blockedTasks.length
        ? 'Destravar as tasks críticas bloqueadas e reduzir carry-over.'
        : staleTasks.length
            ? 'Atualizar tasks em andamento e reduzir WIP antes de abrir novas frentes.'
            : 'Melhorar qualidade de criação e critérios de aceite das tasks prioritárias.';
    return {
        executive_summary: {
            throughput: {
                value: throughput,
                formatted: formatNumber(throughput),
                period: 'Janela atual de tasks carregadas',
                label: 'Throughput',
                description: 'Quantidade de tasks concluídas no período analisado.',
                calculation: 'Contagem de tasks com status done.',
                suggested_action: 'Comparar com a capacidade planejada da sprint.',
            },
            lead_time: {
                value: median(leadTimes),
                formatted: formatHours(median(leadTimes)),
                period: 'Tasks concluídas no período',
                label: 'Lead Time',
                description: 'Tempo entre criação e conclusão.',
                calculation: 'Mediana de completed_at - created_at.',
                suggested_action: 'Atuar em bloqueios e clareza das tasks para reduzir o lead time.',
            },
            cycle_time: {
                value: median(cycleTimes),
                formatted: formatHours(median(cycleTimes)),
                period: 'Tasks concluídas com started_at',
                label: 'Cycle Time',
                description: 'Tempo entre início real e conclusão.',
                calculation: 'Mediana de completed_at - started_at.',
                suggested_action: 'Reduzir interrupções e dependências durante a execução.',
            },
            sprint_completion_rate: {
                value: average(sprintCompletion.map((item) => percent(item.completed, item.planned))),
                formatted: formatPercent(average(sprintCompletion.map((item) => percent(item.completed, item.planned)))),
                period: 'Sprints carregadas',
                label: 'Sprint Completion Rate',
                description: 'Percentual médio de tasks concluídas por sprint.',
                calculation: 'Média de completed/planned por sprint.',
                suggested_action: 'Replanejar escopo quando a taxa cair abaixo do nível esperado.',
            },
            carry_over_rate: {
                value: average(sprintCompletion.map((item) => percent(item.carryOver, item.planned))),
                formatted: formatPercent(average(sprintCompletion.map((item) => percent(item.carryOver, item.planned)))),
                period: 'Sprints carregadas',
                label: 'Carry-over Rate',
                description: 'Percentual médio de trabalho que sobra ao fim da sprint.',
                calculation: 'Média de carryOver/planned por sprint.',
                suggested_action: 'Reduzir WIP e revisar dependências antes da entrada na sprint.',
            },
            rework_rate: {
                value: percent(tasks.filter((task) => (task.had_rework === true) || (task.reopened_count ?? 0) > 0).length, tasks.length),
                formatted: formatPercent(percent(tasks.filter((task) => (task.had_rework === true) || (task.reopened_count ?? 0) > 0).length, tasks.length)),
                period: 'Portfolio atual',
                label: 'Rework Rate',
                description: 'Percentual de tasks com retrabalho identificado.',
                calculation: 'Tasks com had_rework=true ou reopened_count>0 dividido pelo total.',
                suggested_action: 'Melhorar definição de pronto e critérios de aceite.',
            },
            block_rate: {
                value: percent(tasks.filter((task) => (task.blocked_count ?? 0) > 0 || task.status === 'blocked').length, tasks.length),
                formatted: formatPercent(percent(tasks.filter((task) => (task.blocked_count ?? 0) > 0 || task.status === 'blocked').length, tasks.length)),
                period: 'Portfolio atual',
                label: 'Block Rate',
                description: 'Percentual de tasks que sofreram bloqueio.',
                calculation: 'Tasks com blocked_count>0 ou status blocked dividido pelo total.',
                suggested_action: 'Atacar categorias de bloqueio mais frequentes.',
            },
            average_completeness_score: {
                value: average(consolidatedScores),
                formatted: formatPercent(average(consolidatedScores)),
                period: 'Portfolio atual',
                label: 'Average Completeness Score',
                description: 'Score médio consolidado de completude operacional.',
                calculation: 'Média do score consolidado das tasks.',
                suggested_action: 'Preencher campos críticos nas tasks high/critical.',
            },
            operational_risk: {
                value: Math.min(1, average([
                    percent(blockedTasks.length, tasks.length),
                    percent(staleTasks.length, tasks.length),
                    1 - average(consolidatedScores || [0]),
                    percent(allSignals.filter((signal) => signal.severity === 'critical').length, Math.max(allSignals.length, 1)),
                ])),
                formatted: formatPercent(Math.min(1, average([
                    percent(blockedTasks.length, tasks.length),
                    percent(staleTasks.length, tasks.length),
                    1 - average(consolidatedScores || [0]),
                    percent(allSignals.filter((signal) => signal.severity === 'critical').length, Math.max(allSignals.length, 1)),
                ]))),
                period: 'Portfolio atual',
                label: 'Risco Operacional Geral',
                description: 'Leitura composta de bloqueios, stale work, completude e sinais críticos.',
                calculation: 'Média normalizada dos componentes de risco.',
                suggested_action: 'Priorizar sinais críticos antes de aumentar o escopo.',
            },
            main_bottleneck: mainBottleneck,
            weekly_focus: weeklyFocus,
        },
        flow: {
            aging: {
                value: median(agingValues),
                formatted: formatHours(median(agingValues)),
                period: 'Tasks abertas',
                label: 'Aging',
                description: 'Tempo mediano que as tasks abertas estão no sistema.',
                calculation: 'Mediana de now - created_at para tasks não encerradas.',
            },
            time_in_stage: timeInStage,
            distribution_by_status: {
                backlog: tasks.filter((task) => task.status === 'backlog').length,
                in_progress: tasks.filter((task) => task.status === 'in_progress').length,
                review: reviewTasks.length,
                done: doneTasks.length,
                blocked: blockedTasks.length,
                archived: tasks.filter((task) => task.status === 'archived').length,
            },
            wip: {
                value: tasks.filter((task) => ['in_progress', 'review', 'blocked'].includes(task.status)).length,
                formatted: formatNumber(tasks.filter((task) => ['in_progress', 'review', 'blocked'].includes(task.status)).length),
                period: 'Estado atual',
                label: 'WIP',
                description: 'Trabalho em andamento incluindo review e bloqueios.',
                calculation: 'Contagem de in_progress + review + blocked.',
                suggested_action: 'Limitar novas entradas quando o WIP ultrapassar a capacidade.',
            },
            review_bottleneck_count: reviewTasks.length,
            stale_tasks_count: staleTasks.length,
            blocked_tasks_count: blockedTasks.length,
            average_blocked_time: {
                value: average(blockedTimes),
                formatted: formatHours(average(blockedTimes)),
                period: 'Tasks com histórico de bloqueio',
                label: 'Average Blocked Time',
                description: 'Tempo médio acumulado em bloqueio por task.',
                calculation: 'Média de total_blocked_time_seconds / 3600.',
                suggested_action: 'Atacar categorias de bloqueio com maior impacto.',
            },
        },
        predictability: {
            sprint_completion_rate: {
                value: average(sprintCompletion.map((item) => percent(item.completed, item.planned))),
                formatted: formatPercent(average(sprintCompletion.map((item) => percent(item.completed, item.planned)))),
                period: 'Sprints carregadas',
                label: 'Sprint Completion Rate',
                description: 'Percentual médio de tasks concluídas por sprint.',
                calculation: 'Média de completed/planned.',
            },
            carry_over_by_sprint: sprintCompletion.map((item) => ({
                sprint_id: item.sprint_id,
                goal: item.goal,
                rate: percent(item.carryOver, item.planned),
            })),
            planned_vs_completed: sprintCompletion.map((item) => ({
                sprint_id: item.sprint_id,
                goal: item.goal,
                planned: item.planned,
                completed: item.completed,
            })),
            estimate_vs_actual: {
                value: average(estimateVsActualValues),
                formatted: estimateVsActualValues.length ? `${average(estimateVsActualValues).toFixed(2)}x` : 'n/d',
                period: 'Tasks concluídas com estimativa',
                label: 'Estimate vs Actual',
                description: 'Relação média entre esforço real e estimado.',
                calculation: 'Média de actual_hours / estimate_hours.',
                suggested_action: 'Revisar calibragem das estimativas em tasks similares.',
            },
            on_time_vs_delayed: {
                on_time: completedOnTime,
                delayed: delayedTasks,
            },
            scope_stability: sprintCompletion.map((item) => ({
                sprint_id: item.sprint_id,
                goal: item.goal,
                had_scope_deviation: item.hadScopeDeviation,
            })),
        },
        quality: {
            creation_completeness: {
                value: average(creationScores),
                formatted: formatPercent(average(creationScores)),
                period: 'Portfolio atual',
                label: 'Creation Completeness',
                description: 'Score médio de completude de criação.',
                calculation: 'Média do score de criação das tasks.',
            },
            progress_completeness: {
                value: average(progressScores),
                formatted: formatPercent(average(progressScores)),
                period: 'Portfolio atual',
                label: 'Progress Completeness',
                description: 'Score médio de completude de progresso.',
                calculation: 'Média do score de progresso das tasks.',
            },
            closure_completeness: {
                value: average(closureScores),
                formatted: formatPercent(average(closureScores)),
                period: 'Portfolio atual',
                label: 'Closure Completeness',
                description: 'Score médio de completude de encerramento.',
                calculation: 'Média do score de closure das tasks.',
            },
            consolidated_completeness: {
                value: average(consolidatedScores),
                formatted: formatPercent(average(consolidatedScores)),
                period: 'Portfolio atual',
                label: 'Consolidated Completeness',
                description: 'Score médio consolidado.',
                calculation: 'Média dos scores consolidados.',
            },
            most_missing_fields: [...missingFieldsMap.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([field, count]) => ({ field, count })),
            high_priority_without_acceptance_criteria: tasks.filter((task) => ['high', 'critical'].includes(task.priority) && !isFilled(task.acceptance_criteria)).length,
            low_completeness_tasks: completeness.filter((item) => item.consolidated < 0.6).length,
        },
        blockers_and_risk: {
            block_rate: {
                value: percent(tasks.filter((task) => (task.blocked_count ?? 0) > 0 || task.status === 'blocked').length, tasks.length),
                formatted: formatPercent(percent(tasks.filter((task) => (task.blocked_count ?? 0) > 0 || task.status === 'blocked').length, tasks.length)),
                period: 'Portfolio atual',
                label: 'Block Rate',
                description: 'Percentual de tasks com histórico de bloqueio.',
                calculation: 'Tasks bloqueadas / total de tasks.',
            },
            average_blocked_time: {
                value: average(blockedTimes),
                formatted: formatHours(average(blockedTimes)),
                period: 'Tasks com bloqueio',
                label: 'Average Blocked Time',
                description: 'Tempo médio em bloqueio.',
                calculation: 'Média de total_blocked_time_seconds.',
            },
            blocked_aging_hours: median(blockedTasks.map((task) => hoursBetween(task.last_blocked_at, referenceDate))),
            block_categories: [...blockCategoriesMap.entries()].map(([category, count]) => ({ category, count })),
            critical_blocked_tasks: blockedTasks.filter((task) => task.priority === 'critical').length,
            retrabalho: {
                value: percent(tasks.filter((task) => task.had_rework === true).length, tasks.length),
                formatted: formatPercent(percent(tasks.filter((task) => task.had_rework === true).length, tasks.length)),
                period: 'Portfolio atual',
                label: 'Retrabalho',
                description: 'Percentual de tasks com retrabalho marcado.',
                calculation: 'Tasks com had_rework dividido pelo total.',
            },
            reopening_rate: {
                value: percent(tasks.filter((task) => (task.reopened_count ?? 0) > 0).length, tasks.length),
                formatted: formatPercent(percent(tasks.filter((task) => (task.reopened_count ?? 0) > 0).length, tasks.length)),
                period: 'Portfolio atual',
                label: 'Reopening Rate',
                description: 'Percentual de tasks reabertas.',
                calculation: 'Tasks com reopened_count>0 dividido pelo total.',
            },
            risk_by_sprint: sprintCompletion.map((item) => ({
                sprint_id: item.sprint_id,
                goal: item.goal,
                risk_score: item.riskScore,
            })),
        },
    };
}
