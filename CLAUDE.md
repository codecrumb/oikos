# Oikos — CLAUDE.md

## What this project is

Oikos is a self-hosted family dashboard PWA. This branch (`feature/vite-react-supabase`) is the full migration from the original Express + SQLite + vanilla-JS stack to **Vite + React + Supabase**, targeting **Cloudflare Pages** for hosting.

## Stack (this branch)

| Layer | Tech |
|-------|------|
| Frontend | Vite 6 · React 18 · React Router 6 |
| Auth + Database + Realtime | Supabase |
| Icons | lucide-react |
| Calendar | @fullcalendar/react |
| Deployment | Cloudflare Pages |
| Background jobs | Cloudflare Workers (deferred — not yet built) |

## Key files

```
index.html                  Vite SPA entry (links all CSS from public/styles/)
vite.config.js              Build config with manual chunk splitting
src/
  main.jsx                  React root
  App.jsx                   Router + AuthProvider
  context/AuthContext.jsx   Session + member state (Supabase Auth)
  lib/supabase.js           Supabase client (reads VITE_* env vars)
  components/
    ProtectedRoute.jsx      Auth guard — redirects to /signin or /household-setup
    Layout.jsx              App shell (sidebar + bottom nav + Outlet)
  pages/
    SignIn.jsx / SignUp.jsx  Auth pages
    HouseholdSetup.jsx      Create-or-join household (runs after first sign-up)
    Dashboard.jsx           Home screen
    Chores.jsx              Chores with Realtime + member colour coding
    Shopping.jsx            Shopping list with Realtime
    CalendarPage.jsx        FullCalendar + Supabase events + Realtime
public/
  styles/                   ALL CSS — original design system, untouched
    app.css                 New utility classes added during React migration
  manifest.json             PWA manifest (icons, display: standalone)
  _redirects                Cloudflare Pages SPA fallback rule
supabase/
  migrations/001_initial_schema.sql   Full schema + RLS policies — run in Supabase SQL editor
```

## Environment variables

Copy `.env.example` → `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never commit `.env`. Both vars are `VITE_` prefixed so Vite exposes them to the browser bundle.

## Design system rules

- **Do not redesign anything visually.** All colours, spacing, typography, and component patterns come from the existing CSS in `public/styles/`.
- New component classes go in `public/styles/app.css`.
- CSS custom properties from `tokens.css` are the design system API — use them, don't hardcode values.
- Dark mode is handled entirely by CSS (`@media prefers-color-scheme` + private/public token architecture in `tokens.css`).

## Running locally

```bash
cp .env.example .env    # fill in Supabase creds
npm install
npm run dev             # Vite dev server on :5173
```

## Deploying to Cloudflare Pages

1. Connect the repo in the Cloudflare Pages dashboard.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Pages settings.

## Supabase setup

Run `supabase/migrations/001_initial_schema.sql` in your Supabase project's SQL editor (Database → SQL Editor). This creates all tables, the `current_household_id()` helper function, RLS policies, and enables Realtime.

## What's deferred (not yet built)

- Cloudflare Worker / push notification system
- Full Dashboard widgets (weather, upcoming events summary)
- Remaining original pages: meals, budget, notes, contacts, documents, birthdays
