# CONTEXT.md — StudyTrack Frontend

Decisões de arquitetura não óbvias e tradeoffs que não ficam claros só lendo o código.

---

## Padrão SSR híbrido: Server Component + Client Shell

Usado em:
- `src/app/partners/[slug]/dashboard/` → `page.tsx` + `FounderDashboardClient.tsx`
- `src/app/partners/[slug]/redacoes/` → `page.tsx` + `PartnerRedacoesClient.tsx`
- `src/app/partners/[slug]/student/desempenho/` → `page.tsx` + `DesempenhoClient.tsx`

### Como funciona

`page.tsx` é um Server Component assíncrono que busca os dados antes de enviar HTML ao browser. O `*Client.tsx` recebe os dados como props e inicializa o estado diretamente — sem tela de loading no carregamento inicial.

Se o fetch do servidor falhar, `initialState` chega como `null` e o `useEffect` no client faz o fallback e busca os dados normalmente.

```
Antes: browser → carrega JS → dispara fetch → espera → renderiza
Depois: servidor busca dados → HTML já populado chega no browser
```

### Custo de manutenção

**A lógica de fetch existe em dois lugares: `page.tsx` (server) e `useEffect` no `*Client.tsx` (fallback client).**

Se mudar um endpoint, renomear um campo, ou adicionar um dado novo, precisa atualizar os dois. Se esquecer de sincronizar, o comportamento fica diferente dependendo de se o SSR funcionou ou não — um bug silencioso.

### Convenções para não desincronizar

- O `useEffect` no client tem um guard no topo: `if (initialState !== null) return;`  
  Isso garante que o fallback só roda quando o server falhou — não há double-fetch.
- O estado é inicializado com `useState(initialState)` e `loading` começa como `initialState === null`.
- Mudanças no shape dos dados devem ser feitas em ambos os lugares ao mesmo tempo.

### Detalhes por página

**`dashboard/page.tsx`**  
Usa `createClient()` do Supabase server para pegar o token, depois chama o backend Flask diretamente com `Authorization: Bearer`. Usa `process.env.API_URL` (não `NEXT_PUBLIC_API_URL`).

**`redacoes/page.tsx`**  
A rota `/api/partners/[slug]/essays/overview` é uma Next.js API Route que consulta o Supabase diretamente (não o Flask). A autenticação é via cookie de sessão, não Bearer token. Por isso o `page.tsx` usa `headers()` do `next/headers` para encaminhar o cookie e constrói a URL completa com `x-forwarded-host`/`x-forwarded-proto`.

**`desempenho/page.tsx`**  
Todos os endpoints são Flask (Bearer token). Faz 5 fetches em paralelo, depois busca detalhes das redações corrigidas recentes em sequência (depende do resultado da lista de redações).

### Alternativas consideradas

- **Sem fallback client** — se o server fetch falhar, retorna erro explícito. Mais simples, sem duplicação.
- **Só SSR, sem `useEffect`** — client só renderiza, recarrega via botão manual. Elimina completamente a duplicação.
- **Manter `'use client'` puro** — custo zero de manutenção, mas exige loading inicial no browser.

O padrão atual faz sentido para páginas estáveis onde os endpoints não mudam com frequência.
