<div align="center">
  <h1>Oikos</h1>
  <p><strong>Private family dashboard — installable PWA for your household</strong></p>

  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Vite-React-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite + React">
  <img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Pages">
  <a href="https://deepwiki.com/codecrumb/oikos"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</div>

<br>

Oikos is a self-hosted family planner built as a PWA. Fork it, connect your own Supabase project and Cloudflare Pages deployment, and you have a private dashboard for your household — no subscriptions, no shared servers, your data stays in your own database.

## Features

| Module | Description |
|--------|-------------|
| **Chores** | Assign tasks to household members with due dates, overdue highlighting, and recurrence |
| **Shopping list** | Shared list with real-time sync across all devices |
| **Calendar** | Family calendar with drag-and-drop event management |
| **Household** | Invite family members by email, manage roles, colour-coded avatars |

Everything syncs in real time via Supabase Realtime — changes on one device appear instantly on all others.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite 6 + React 18 + React Router |
| Auth + Database + Realtime | Supabase |
| Deployment | Cloudflare Pages |
| Invite emails | Supabase Edge Functions |

## Deploy your own

See **[DEPLOY.md](DEPLOY.md)** for the full step-by-step guide. The short version:

1. Fork this repo
2. Create a Supabase project and run `supabase/setup.sql` in the SQL editor
3. Connect the fork to Cloudflare Pages with two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy the invite Edge Function
5. Sign up, name your household, invite your family

Total setup time: ~15 minutes. Free tier on both Supabase and Cloudflare Pages covers a typical household easily.

## Running locally

```bash
git clone https://github.com/your-username/oikos
cd oikos
cp .env.example .env   # fill in your Supabase credentials
npm install
npm run dev            # http://localhost:5173
```

## Security

Each deployment is fully isolated — your household's data never touches anyone else's database. Row-level security policies on every table ensure users can only access their own household's data even if the anon key is exposed. See [DEPLOY.md](DEPLOY.md) for the full security model.

## License

MIT — see [LICENSE](LICENSE).
