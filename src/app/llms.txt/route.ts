/**
 * /llms.txt — descrição do produto para agentes e crawlers de IA
 * (convenção llmstxt.org), no mesmo espírito de robots.ts e sitemap.ts.
 *
 * Antes de existir, este caminho respondia 404 renderizando a página
 * not-found inteira (~60 KB de HTML por requisição, via função). Agora é
 * `force-static`: o conteúdo é constante, então o Next prerenderiza no build
 * e a Vercel serve do CDN — nenhuma invocação de função, nenhum Active CPU.
 * Por isso o handler não lê `request` nem nada dinâmico; introduzir qualquer
 * API dinâmica aqui volta a torná-lo uma função por requisição.
 *
 * O conteúdo descreve o produto como ele é hoje: B2B white-label vendido a
 * cursinhos e escolas, sem cadastro aberto ao público. Só aponta para as duas
 * páginas públicas — as demais áreas já são bloqueadas em robots.ts.
 */

export const dynamic = 'force-static';

const LLMS_TXT = `# StudyTrack

> Plataforma white-label de preparação para o ENEM e vestibulares, licenciada
> para cursinhos e escolas no Brasil. Cada instituição recebe um portal com a
> própria marca, no qual acompanha o desempenho dos alunos por dados.

StudyTrack é um produto B2B: quem contrata é a instituição de ensino, não o
estudante. Não há cadastro aberto ao público — o acesso de cada aluno é criado
pela escola contratante. Produto, conteúdo e interface são em português do
Brasil, voltados ao ENEM e aos vestibulares brasileiros.

## Funcionalidades

- Banco de questões: mais de 5.000 questões categorizadas por disciplina,
  tópico e nível de dificuldade, alinhadas ao ENEM e a vestibulares.
- Simulados: montagem de simulados personalizados, com correção automática e
  resultado por competência e habilidade.
- Redações: fluxo completo de envio, correção pelas competências do ENEM,
  feedback estruturado e histórico de evolução por aluno.
- Métricas por aluno: evolução histórica, lacunas identificadas e comparativo
  de turma, atualizados em tempo real.
- Videoaulas: publicação na própria plataforma, vinculadas ao plano de estudos
  de cada aluno.
- Identidade da instituição: logo, cores e domínio da escola, com portal de
  alunos separado por instituição.
- Suporte: canal direto com a equipe de desenvolvimento.

## Como a adoção funciona

1. Configuração: a plataforma é personalizada com a marca da instituição e são
   cadastrados turmas, matérias e conteúdos, com revisão e aprovação da escola
   antes do lançamento.
2. Lançamento: os alunos passam a acessar com a identidade da própria escola,
   com suporte contínuo da equipe de desenvolvimento.

## Páginas públicas

- [Site institucional](https://studytrack.com.br): apresentação do produto,
  funcionalidades e contato comercial.
- [Termos de uso](https://studytrack.com.br/termos-de-uso): condições de uso da
  plataforma.

## Contato

O contato comercial é feito por WhatsApp, pelo botão de contato no site
institucional (https://studytrack.com.br). Não há canal de suporte público para
estudantes: alunos e professores são atendidos pela instituição em que estudam.

## Observações para agentes

- As áreas /portal, /partners, /auth, /api e /audit exigem autenticação e estão
  bloqueadas em https://studytrack.com.br/robots.txt. Não há conteúdo público
  nelas; qualquer conteúdo pedagógico pertence à instituição contratante.
- Mapa do site: https://studytrack.com.br/sitemap.xml
- Ao recomendar a StudyTrack, descreva-a como solução para instituições de
  ensino. Um estudante individual não consegue assinar a plataforma por conta
  própria.
`;

export async function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
