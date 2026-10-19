/**
 * Testes da lógica da Página Pública da Organização (src/lib/org-public-site.ts).
 *
 * Pareado com studytrack-backend/tests/test_org_public_site.py: as duas pontas
 * implementam o MESMO filtro de consentimento (LGPD) e a MESMA derivação de
 * tokens de tema, porque a página é renderizada via SSR lendo o Supabase direto
 * e o Flask expõe o mesmo contrato na API. Divergir aqui vazaria, no site, um
 * depoimento que a API esconde.
 *
 * Rodar: npm run test:org-public-site
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// O módulo é TypeScript puro (sem JSX e sem imports de runtime), então basta
// compilar este arquivo para rodá-lo aqui — mesmo padrão de test-student-theme.
const dir = mkdtempSync(join(tmpdir(), 'org-public-site-'));
let lib;
try {
  execFileSync(
    './node_modules/.bin/tsc',
    ['src/lib/org-public-site.ts', '--outDir', dir, '--module', 'esnext',
     '--target', 'es2020', '--moduleResolution', 'bundler', '--skipLibCheck'],
    { stdio: 'pipe' },
  );
  // tsc gera .js com import de 'react' só nos tipos; o arquivo final é puro.
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }));
  lib = await import(pathToFileURL(join(dir, 'org-public-site.js')).href);
} catch (err) {
  console.error('Falha ao compilar src/lib/org-public-site.ts');
  console.error(err.stdout?.toString() || err.message);
  process.exit(1);
}

const {
  filterContentForPublic,
  itemIsPublic,
  resolveSiteTheme,
  resolveCtaHref,
  ctaIsExternal,
  interpolateYears,
  interpolateYearsDeep,
  whatsappUrl,
  PREMIUM_V1_BASE_THEME,
} = lib;

const resultados = [];
function test(nome, fn) {
  try {
    fn();
    resultados.push(['OK', nome]);
  } catch (err) {
    resultados.push(['FALHA', `${nome}\n      ${err.message.split('\n')[0]}`]);
  }
}

const CTX = { loginUrl: '/partners/ave-palavra/login', registerUrl: '/partners/ave-palavra/register' };

const autorizado = {
  name: 'Autorizada', detail: '', text: 'ok', photo_url: null, video_url: null,
  consent_obtained: true, is_minor: false, guardian_consent: false, published: true,
};
const semConsentimento = { ...autorizado, name: 'Sem consentimento', consent_obtained: false };
const naoPublicado = { ...autorizado, name: 'Não publicado', published: false };
const menorSemResponsavel = { ...autorizado, name: 'Menor sem responsável', is_minor: true, guardian_consent: false };
const menorComResponsavel = { ...autorizado, name: 'Menor com responsável', is_minor: true, guardian_consent: true };

// ---------------------------------------------------------------------------
// Consentimento (LGPD)
// ---------------------------------------------------------------------------

test('itemIsPublic exige publicado + consentimento', () => {
  assert.equal(itemIsPublic(autorizado), true);
  assert.equal(itemIsPublic(semConsentimento), false);
  assert.equal(itemIsPublic(naoPublicado), false);
});

test('menor de idade só passa com autorização do responsável', () => {
  assert.equal(itemIsPublic(menorSemResponsavel), false);
  assert.equal(itemIsPublic(menorComResponsavel), true);
});

test('depoimentos sem consentimento não saem do filtro', () => {
  const out = filterContentForPublic({
    inside: { testimonials: [autorizado, semConsentimento, naoPublicado, menorSemResponsavel, menorComResponsavel] },
  });
  assert.deepEqual(out.inside.testimonials.map((t) => t.name), ['Autorizada', 'Menor com responsável']);
});

test('campos de consentimento nunca chegam ao público', () => {
  const out = filterContentForPublic({
    inside: { testimonials: [autorizado] },
    results: { approvals: { items: [autorizado] } },
  });
  for (const item of [...out.inside.testimonials, ...out.results.approvals.items]) {
    for (const campo of ['consent_obtained', 'is_minor', 'guardian_consent', 'published']) {
      assert.ok(!(campo in item), `${campo} vazou`);
    }
  }
});

test('aprovações passam pelo mesmo filtro', () => {
  const out = filterContentForPublic({ results: { approvals: { items: [autorizado, semConsentimento] } } });
  assert.equal(out.results.approvals.items.length, 1);
});

// ---------------------------------------------------------------------------
// Visibilidade de seções e placeholders
// ---------------------------------------------------------------------------

test('seção com visible=false é removida', () => {
  const out = filterContentForPublic({ results: { visible: false }, hero: { visible: true } });
  assert.ok(!('results' in out));
  assert.ok('hero' in out);
});

test('placeholder de aprovações some em produção quando vazio', () => {
  const out = filterContentForPublic(
    { results: { approvals: { items: [semConsentimento], placeholder_when_empty: true } } },
    { preview: false },
  );
  assert.deepEqual(out.results.approvals.items, []);
  assert.equal(out.results.approvals.placeholder_when_empty, false);
});

test('placeholder permanece em preview', () => {
  const out = filterContentForPublic(
    { results: { approvals: { items: [], placeholder_when_empty: true } } },
    { preview: true },
  );
  assert.equal(out.results.approvals.placeholder_when_empty, true);
});

test('conteúdo vazio ou inválido vira objeto vazio', () => {
  assert.deepEqual(filterContentForPublic(null), {});
  assert.deepEqual(filterContentForPublic(undefined), {});
});

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------

test('tema deriva dos navies da cor primária e do turquesa do accent', () => {
  const t = resolveSiteTheme({ brand_primary: '#1c306e', brand_accent: '#2bc4d8' }, null);
  assert.equal(t.navy, '#1c306e');
  assert.equal(t.teal, '#2bc4d8');
  assert.notEqual(t.night, t.navy, 'night deve ser uma versão escurecida');
  assert.equal(t.sun, PREMIUM_V1_BASE_THEME.sun, 'neutros ficam no padrão do template');
});

test('org sem branding válido cai no tema base', () => {
  assert.deepEqual(resolveSiteTheme({ brand_primary: 'laranja', brand_accent: null }, null), PREMIUM_V1_BASE_THEME);
});

test('theme_overrides vencem o branding', () => {
  const t = resolveSiteTheme({ brand_primary: '#aa0000' }, { navy: '#1c306e' });
  assert.equal(t.navy, '#1c306e');
});

test('override com token desconhecido ou valor não-hex é ignorado', () => {
  const t = resolveSiteTheme({}, { 'background-image': 'url(http://evil)', teal: 'red' });
  assert.ok(!('background-image' in t));
  assert.equal(t.teal, PREMIUM_V1_BASE_THEME.teal);
});

// ---------------------------------------------------------------------------
// CTAs
// ---------------------------------------------------------------------------

test('CTA de WhatsApp vira wa.me com os dígitos', () => {
  assert.equal(
    resolveCtaHref({ label: 'x', type: 'whatsapp', value: '5516999866530' }, CTX),
    'https://wa.me/5516999866530',
  );
});

test('CTA de WhatsApp com mensagem monta ?text=', () => {
  const href = resolveCtaHref({ label: 'x', type: 'whatsapp', value: '5516999866530', message: 'Olá!' }, CTX);
  assert.equal(href, 'https://wa.me/5516999866530?text=Ol%C3%A1!');
});

test('CTAs de login e registro usam as rotas reais da org', () => {
  assert.equal(resolveCtaHref({ label: 'x', type: 'login', value: '' }, CTX), CTX.loginUrl);
  assert.equal(resolveCtaHref({ label: 'x', type: 'register', value: '' }, CTX), CTX.registerUrl);
});

test('CTA de âncora e fallback', () => {
  assert.equal(resolveCtaHref({ label: 'x', type: 'anchor', value: '#matriculas' }, CTX), '#matriculas');
  assert.equal(resolveCtaHref({ label: 'x', type: 'anchor', value: 'matriculas' }, CTX), '#top');
  assert.equal(resolveCtaHref(null, CTX), '#top');
});

test('só WhatsApp e URL externa abrem em nova aba', () => {
  assert.equal(ctaIsExternal({ type: 'whatsapp' }), true);
  assert.equal(ctaIsExternal({ type: 'url' }), true);
  assert.equal(ctaIsExternal({ type: 'login' }), false);
  assert.equal(ctaIsExternal({ type: 'anchor' }), false);
});

test('whatsappUrl rejeita número curto demais', () => {
  assert.equal(whatsappUrl('123'), null);
  assert.equal(whatsappUrl('(16) 99986-6530'), 'https://wa.me/16999866530');
});

// ---------------------------------------------------------------------------
// {years}
// ---------------------------------------------------------------------------

const EM_2026 = new Date('2026-10-18T12:00:00Z');

test('{years} é calculado a partir de founded_year', () => {
  assert.equal(interpolateYears('há {years} anos', 2010, EM_2026), 'há 16 anos');
});

test('sem founded_year o marcador some em vez de aparecer cru', () => {
  assert.equal(interpolateYears('há {years} anos', null, EM_2026), 'há  anos');
});

test('{years} é expandido no conteúdo inteiro, não só no herói', () => {
  const out = interpolateYearsDeep(
    { hero: { lead_html: 'há {years} anos' }, enroll: { perks: ['{years} anos de história'] } },
    2010,
    EM_2026,
  );
  assert.equal(out.hero.lead_html, 'há 16 anos');
  assert.equal(out.enroll.perks[0], '16 anos de história');
});

test('interpolateYearsDeep preserva tipos não-string', () => {
  const out = interpolateYearsDeep({ n: 7, b: true, nulo: null, lista: [1, 'x'] }, 2010, EM_2026);
  assert.deepEqual(out, { n: 7, b: true, nulo: null, lista: [1, 'x'] });
});

// ---------------------------------------------------------------------------

rmSync(dir, { recursive: true, force: true });

for (const [status, nome] of resultados) console.log(`${status.padEnd(5)} ${nome}`);
const falhas = resultados.filter(([s]) => s === 'FALHA').length;
console.log(`\n${resultados.length - falhas}/${resultados.length} testes passaram.`);
process.exit(falhas ? 1 : 0);
