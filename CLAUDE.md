# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudyTrack frontend is a Next.js 16 + TypeScript app for a Brazilian ENEM exam preparation platform. Deployed to Vercel, using Supabase for auth and data, and calling a Flask backend (`studytrack-backend/`) for AI-heavy operations.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Dev server at localhost:3000 (Turbopack)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Routing

Next.js App Router with route groups:
- `/` — Landing page (public)
- `/auth/*` — Login, register pages
- `/portal/*` — Main protected app (requires auth)
- `/jogos/*` — Games section
- `/api/*` — Server-side API routes (bypass auth middleware)

### Authentication & RBAC

Middleware at `src/lib/supabase/middleware.ts` validates sessions server-side and enforces role-based redirects. Roles: `student`, `teacher`, `manager`, `admin`, `secretariat`.

Three Supabase clients with different scopes:
- `src/lib/supabase/client.ts` — browser (anon key)
- `src/lib/supabase/server.ts` — SSR (anon key + cookies)
- `src/lib/supabase/admin.ts` — API routes only (service role key, never expose to browser)

### Data Flow

Simple CRUD goes directly to Supabase from the frontend. AI-heavy features (exam adaptation, essay grading, scheduled messages) call the Flask backend at `NEXT_PUBLIC_API_URL`.

### State & Data Fetching

- **State management:** Zustand (not Redux)
- **Server data:** SWR + Supabase client
- **Contexts:** `PortalRoleContext` (role propagation), `SidebarContext` (layout state)

### Component Organization

Feature-based under `src/components/`:
- `ui/` — Base primitives (shadcn/Radix UI)
- `dashboard/`, `questions/`, `assessments/`, `adaptation/`, `goals/` — Feature components
- `layout/`, `modals/`, `widgets/` — Shared structural components

### Key Libraries

- **UI:** Radix UI + Tailwind CSS v4 + `class-variance-authority`
- **Math rendering:** KaTeX (ENEM questions with formulas)
- **Charts:** Recharts
- **Animation:** Framer Motion
- **PDF export:** jspdf + html-to-image
- **XSS protection:** `isomorphic-dompurify` — always sanitize user-generated HTML before rendering
- **Notifications:** Sonner (toast)

### Path Alias

`@/*` maps to `src/*`.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public access
- `NEXT_PUBLIC_API_URL` — Flask backend URL (default: `http://127.0.0.1:5000`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — server-side admin access (API routes only)
- `NEXT_PUBLIC_API_KEY` — Anthropic API key (used in `/api/*` routes)
