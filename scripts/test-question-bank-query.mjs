import assert from 'node:assert/strict';
import { buildQuestionBankQuery } from '../.tmp-question-bank-tests/questionBankQuery.js';

const filters = { questionType: 'concurso', role: 'Soldado', institution: 'PMMG', area: 'Segurança', region: 'MG', subjects: ['Português', 'Matemática'], banks: ['PMMG', 'FGV'], topics: ['Interpretação'], years: ['2019', '2025'], difficulties: ['Médio'], tab: 'todo' };
const query = buildQuestionBankQuery(filters, 2);
for (const [key, value] of Object.entries({ question_type: 'concurso', role: 'Soldado', institution: 'PMMG', area: 'Segurança', region: 'MG', tab: 'todo', page: '2', limit: '20' })) assert.equal(query.get(key), value);
for (const [key, values] of Object.entries({ subject: filters.subjects, bank: filters.banks, topic: filters.topics, year: filters.years, difficulty: filters.difficulties })) assert.deepEqual(query.getAll(key), values);
const empty = buildQuestionBankQuery({ ...filters, questionType: 'vestibular', role: 'Todas', institution: 'Todas', area: 'Todas', region: 'Todas', subjects: [], banks: [], topics: [], years: [], difficulties: [], tab: 'done' }, 1);
for (const key of ['role', 'institution', 'area', 'region', 'subject', 'bank', 'topic', 'year', 'difficulty']) assert.equal(empty.has(key), false);
assert.equal(empty.get('question_type'), 'vestibular');
assert.equal(empty.get('tab'), 'done');
assert.equal(buildQuestionBankQuery({ ...filters, tab: 'all' }, 1).get('tab'), 'all');
assert.equal(buildQuestionBankQuery({ ...filters, questionType: 'todos' }, 1).get('question_type'), 'todos');
assert.deepEqual([...new URLSearchParams(query.toString())], [...query]);
console.log('Question bank query tests passed');
