# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudyTrack frontend is a Next.js 16 + TypeScript app for a Brazilian ENEM/vestibular exam-prep **B2B platform**. The product is sold to *cursinhos* (prep schools) as white-labeled partner portals — not to individual students directly. Deployed to Vercel, using Supabase for auth and data, and calling a Flask backend (`studytrack-backend/`) for AI-heavy operations.

**The product pivoted from B2C (direct-to-student via WhatsApp) to B2B (partner/cursinho portals) in early 2026.** The landing page, auth flows, and every actively-developed feature target cursinhos and their students today — see "Legacy / orphaned code" below for what's left of the old model.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Dev server at localhost:3000 (Turbopack)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

There's no Jest/Vitest suite — a handful of standalone scripts double as smoke tests: `npm run test:essay-credits`, `test:student-theme`, `test:task-intelligence`, `test:dev-role` (run via `node`/`tsc` directly, see `package.json`).

## Architecture

### Routing (App Router)

- **`/partners/[slug]/*`** — **the core product**, a white-labeled portal per partner org (cursinho). Two areas under one root layout (`src/app/partners/[slug]/layout.tsx`, validates auth + org membership + injects branding via `OrgContext`):
  - Founder/management area: `dashboard`, `alunos` (+ `[id]`, `convidar`), `configuracoes`, `planos`, `ranking`, `redacoes` (+ `[id]`), `simulados` (+ scheduling/correction/results), `aulas` (video lessons, opt-in), `suporte`, `exam-results/[submission_id]`, plus public `login`/`register`/`reset`.
  - Student area (`student/*`): `dashboard`, `perfil`, `ranking`, `titulos`, `desempenho`, `banco-de-questoes`, `simulado` (+ history/review), `redacoes` (+ `[id]`, `nova`), `aulas`, `suporte`. Has its own self-contained layout (`OrgProvider`, `StudentThemeProvider`, `EssayNotificationProvider`, `AnnouncementNotificationProvider`) — it does **not** re-export anything from `/portal`.
- **`/portal/*`** — **not** the old B2C student portal. Today it's the internal staff panel (`portal/admin/*`, `portal/dev/tasks`) plus a role-based redirect hub at `/portal` itself, and a legacy-session compat shim. `portal/layout.tsx` detects B2B students (`plan_tier` starts with `b2b_` + `organization_id`) and renders `PartnerLayout` inside `/portal` for old sessions, but every product user's real destination is `/partners/[slug]/*`. Redirect logic in `portal/page.tsx`: `founder` → `/partners/{slug}/dashboard`, B2B `student` → `/partners/{slug}/student/dashboard`, legacy `associate`/`teacher` with an org → `/partners/{slug}/redacoes`, `admin` → `/portal/admin`, `dev` → `/portal/dev/tasks`, anything else → `/`.
- **`(public)/`** route group — landing page, `auth/login`, `auth/reset(/confirm)`, `auth/confirm-email`, `auth/callback`, `termos-de-uso`. URLs are `/auth/login` etc. (route groups don't affect the path).
- **`/audit/questions/[questionId]`** — standalone, unauthenticated (outside the middleware's protected paths), for external content-review links. No page in the app currently generates links to it — treat as fed by an external tool, not orphaned-and-safe-to-delete.
- **`/api/*`** — server-side routes (bypass auth middleware), see below.
- **There is no `/jogos` route** — fully removed, zero references in code.

### Authentication & RBAC

Middleware at `src/lib/supabase/middleware.ts` validates sessions server-side. Roles (`src/types/roles.ts`): `student`, `teacher`, `manager`, `admin`, `secretariat`, `founder`, `associate`, `dev`. **`manager` and `secretariat` are B2C-era leftovers** — defined in the type system but blocked/redirected to `/` in `/portal/*`, with no functional page. `teacher`/`associate` only survive when scoped to an org (redirected to `/partners/{slug}/redacoes`). Fine-grained B2C-vs-B2B routing decisions (based on `plan_tier`/`organization_id`) happen in server components (`portal/layout.tsx`, `portal/page.tsx`), not in the middleware itself.

Three Supabase clients with different scopes:
- `src/lib/supabase/client.ts` — browser (anon key)
- `src/lib/supabase/server.ts` — SSR (anon key + cookies)
- `src/lib/supabase/admin.ts` — API routes only (service role key, never expose to browser)

### Data Flow

Simple CRUD goes directly to Supabase from the frontend. AI-heavy features (essay transcription, question generation, presentation/social-media generation) call the Flask backend at `NEXT_PUBLIC_API_URL`, or in some admin-panel cases call Anthropic directly from `/api/admin/*` routes via `@anthropic-ai/sdk`.

### Multi-tenancy / branding

`src/contexts/OrgContext.tsx` exposes the current org: branding (colors, logo), `slug`, per-module `permissions`, `plan_tier`, `max_students`, `invite_code`. Modules are enabled/disabled per org via `org.permissions` (e.g. `ranking_enabled`, `redacoes_enabled`, `video_lessons_enabled` defaults `false`, `suporte_enabled`) — checked in `ModuleGuard.tsx` and `PartnerLayout.tsx`. CSS vars `--brand-primary/secondary/accent` are available throughout `/partners/[slug]/*`.

### State & Data Fetching

- **Server data:** SWR + Supabase client (actively used, ~12 files)
- **Contexts:** `OrgContext` (B2B org/branding, core), `EssayNotificationContext`, `AnnouncementNotificationContext`, `StudentThemeContext` (all B2B student-area), `PortalRoleContext` + `SidebarContext` (internal staff panel only, `/portal/*`)
- **Zustand is a listed dependency but is not used anywhere in `src/`** — don't reach for it by habit; if you need client-side global state, check whether an existing Context already covers it first.

### Component Organization

Feature-based under `src/components/`:
- `ui/` — Base primitives (shadcn/Radix UI — small subset: dialog, label, progress, select, slot, tabs, tooltip)
- `partners/` — the B2B product's components: `PartnerLayout.tsx` (sidebar/nav, role- and permission-aware), `ModuleGuard.tsx`, `founder-ui.tsx` (shared visual system), `StudentThemeShell.tsx`
  - `partners/gamification/` — deep, active implementation: shield/streak/ranking popups, month-end screen, title system (`titleSystem.ts`), paired with `src/hooks/usePartnerGamification.ts`
  - `partners/essays/` — `PhotoEssayUploader.tsx` (most essay logic lives directly in the `redacoes/*` pages, not extracted into components)
  - `ActivityHistoryModal.tsx` — activity feed UI
- `announcements/` — org announcement bell/notifications
- `landing/` — marketing sections, all B2B-pitched (see below)
- `admin/` — internal staff panel components, including `admin/social-media/`
- `layout/`, `modals/`, `widgets/` — shared structural components
- `assessments/`, `questions/` — question bank / assessment UI, reused by B2B students

### Landing page

100% B2B pitch (`src/app/(public)/page.tsx` + `src/components/landing/*`). The primary CTA routes to WhatsApp *sales*, not student signup: `useWhatsAppContact.ts` builds a `wa.me` link with a fixed message — "Olá! Gostaria de saber mais sobre a StudyTrack para minha instituição." There is no direct-student-signup CTA.

### Legacy / orphaned code — don't build on this without checking first

- **`manager`, `secretariat` roles** — exist in `src/types/roles.ts`/middleware but have no functional page (blocked to `/`).
- **`/jogos`, daily missions (`missao_diaria`), `preference_override`** — fully removed, zero references. Don't resurrect naming from old docs or memory.
- **`/api/admin/whatsapp/*`** and **`/api/admin/reengagement/*`** were removed (2026-07-14) — they implemented a B2C reengagement funnel (`segment: HOT/WARM/COLD`, `conversion_stage` pipeline, AI-suggested WhatsApp replies via Anthropic) that had no caller anywhere in the app. Underlying tables (`profiles.conversion_stage`, `whatsapp_logs`, `admin_actions_log`) still exist but are no longer written to from this repo.

### Key Libraries

- **UI:** Radix UI (partial) + Tailwind CSS v4 + `class-variance-authority` + `tailwindcss-animate`
- **Math rendering:** KaTeX (ENEM questions with formulas)
- **Charts:** Recharts
- **Animation:** Framer Motion
- **PDF/export:** `jspdf`, `html-to-image`, `pptxgenjs`, `jszip` (presentation/social-media generation)
- **Server-side rendering:** `puppeteer-core` + `@sparticuz/chromium-min` (social media asset rendering)
- **File upload:** `tus-js-client` (resumable uploads)
- **XSS protection:** `isomorphic-dompurify` — always sanitize user-generated HTML before rendering
- **Notifications:** Sonner (toast)
- **AI:** `@anthropic-ai/sdk` (used directly in some `/api/admin/*` routes)

### Path Alias

`@/*` maps to `src/*`.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public access
- `NEXT_PUBLIC_API_URL` — Flask backend URL (default: `http://127.0.0.1:5000`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — server-side admin access (API routes only)
- `ANTHROPIC_API_KEY` — server-only (no `NEXT_PUBLIC_` prefix — never rename it to have one, that would inline it into the browser bundle), used in `/api/admin/social-media/*` routes
