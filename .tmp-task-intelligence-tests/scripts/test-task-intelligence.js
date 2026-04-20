"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const intelligence_1 = require("../src/lib/tasks/intelligence");
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
const blockedTask = {
    id: 'task-blocked',
    title: 'Fix payment webhook retries',
    scope: 'Stabilize retry orchestration for failed webhooks.',
    status: 'blocked',
    priority: 'critical',
    created_at: '2026-04-01T09:00:00.000Z',
    updated_at: '2026-04-10T09:00:00.000Z',
    created_by: 'admin-1',
    assignee_id: 'dev-1',
    acceptance_criteria: '',
    expected_outcome: '',
    estimate_hours: 6,
    blocked_count: 1,
    reopened_count: 0,
    total_blocked_time_seconds: 60 * 60 * 72,
    last_blocked_at: '2026-04-10T09:00:00.000Z',
    block_reason: 'Waiting on third-party contract approval',
    block_category: 'dependency',
    history: [
        { field_changed: 'status', old_value: null, new_value: 'backlog', changed_at: '2026-04-01T09:00:00.000Z' },
        { field_changed: 'status', old_value: 'backlog', new_value: 'in_progress', changed_at: '2026-04-03T10:00:00.000Z' },
        { field_changed: 'status', old_value: 'in_progress', new_value: 'blocked', changed_at: '2026-04-10T09:00:00.000Z' },
    ],
};
const doneTask = {
    id: 'task-done',
    title: 'Add sprint burndown widget',
    scope: 'Expose planned vs completed data on the sprint panel.',
    status: 'done',
    priority: 'high',
    created_at: '2026-04-02T09:00:00.000Z',
    updated_at: '2026-04-07T18:00:00.000Z',
    created_by: 'admin-1',
    assignee_id: 'dev-2',
    acceptance_criteria: 'Widget renders on desktop and mobile.',
    expected_outcome: 'Sprint panel shows delivery predictability at a glance.',
    estimate_hours: 8,
    started_at: '2026-04-03T09:00:00.000Z',
    completed_at: '2026-04-07T18:00:00.000Z',
    completion: {
        summary: 'Implemented the burndown widget and wired the API response.',
        files_modified_count: 3,
        files_modified_list: ['page.tsx', 'SprintWidget.tsx', 'route.ts'],
        completed_at: '2026-04-07T18:00:00.000Z',
    },
    history: [
        { field_changed: 'status', old_value: null, new_value: 'backlog', changed_at: '2026-04-02T09:00:00.000Z' },
        { field_changed: 'status', old_value: 'backlog', new_value: 'in_progress', changed_at: '2026-04-03T09:00:00.000Z' },
        { field_changed: 'status', old_value: 'in_progress', new_value: 'review', changed_at: '2026-04-06T14:00:00.000Z' },
        { field_changed: 'status', old_value: 'review', new_value: 'done', changed_at: '2026-04-07T18:00:00.000Z' },
    ],
};
const tasks = [blockedTask, doneTask];
const sprints = [
    {
        id: 'sprint-1',
        goal: 'Operational intelligence MVP',
        start_date: '2026-04-01',
        end_date: '2026-04-12',
        status: 'active',
        tasks,
    },
];
const completeness = (0, intelligence_1.calculateTaskCompleteness)(blockedTask);
assert(completeness.creation.percentage < 70, 'Blocked task should have low creation completeness');
assert(completeness.missing_fields.includes('criterios_de_aceite'), 'Missing acceptance criteria must be flagged');
const taskSignals = (0, intelligence_1.buildTaskSignals)(blockedTask, '2026-04-15T12:00:00.000Z');
assert(taskSignals.some((signal) => signal.type === 'critical_task_blocked'), 'Critical blocked task signal must exist');
assert(taskSignals.some((signal) => signal.type === 'blocked_too_long'), 'Long block signal must exist');
const portfolioSignals = (0, intelligence_1.buildPortfolioSignals)(tasks, sprints, '2026-04-15T12:00:00.000Z');
assert(portfolioSignals.length > 0, 'Portfolio signals should not be empty');
const metrics = (0, intelligence_1.buildDashboardMetrics)(tasks, sprints, '2026-04-15T12:00:00.000Z');
assert(metrics.executive_summary.block_rate.value > 0, 'Block rate must be greater than zero');
assert(metrics.executive_summary.throughput.value === 1, 'Throughput should count done tasks');
assert(metrics.quality.high_priority_without_acceptance_criteria >= 1, 'High-priority tasks without acceptance criteria must be counted');
assert(metrics.blockers_and_risk.critical_blocked_tasks === 1, 'Critical blocked tasks metric must match sample data');
console.log('task intelligence tests: ok');
