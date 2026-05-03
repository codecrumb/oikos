# Deploying Oikos

One Supabase project + one Cloudflare Pages deployment = your private family dashboard.  
No server to manage. Free tier covers a typical household easily.

---

## Prerequisites

- A [Supabase](https://supabase.com) account (free)
- A [Cloudflare](https://cloudflare.com) account (free)
- Your fork of this repo on GitHub

---

## Step 1 — Supabase project

1. Create a new project at **supabase.com/dashboard**
2. Go to **SQL Editor** and run the two migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_member_trigger.sql`
3. Run the RPC helper functions (also in SQL Editor):
   - `supabase/migrations/003_rpc_functions.sql`  
     *(or run the `create_household` and `join_household` functions manually)*
4. Go to **Authentication → Settings**:
   - Turn **off** "Enable email confirmations" (makes sign-in instant)
   - Optionally restrict sign-ups to specific email domains under "Allowed email domains"
5. Note your credentials from **Project Settings → API**:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 2 — Cloudflare Pages

1. Go to **Cloudflare Dashboard → Workers & Pages → Create → Pages**
2. Connect your GitHub fork
3. Configure the build:
   | Setting | Value |
   |---------|-------|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
4. Add environment variables:
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
5. Click **Save and Deploy**

Your app will be live at `your-project-name.pages.dev`.

---

## Step 3 — First-time setup

1. Open your deployed URL
2. Click **Sign up** — enter your name, email, and a strong password
3. Name your household
4. You're in

To add family members:
1. Go to **Settings** in the app
2. Copy your **Household ID**
3. Share it with family — they sign up and paste the ID on the "Join" screen

---

## Step 4 — Lock it down (important)

After everyone in your household has signed up, disable new sign-ups so strangers can't create accounts on your instance:

**Supabase → Authentication → Settings → "Disable sign-ups" → Save**

Existing accounts still work. New sign-ups will be blocked.

---

## Security model

| Layer | What it does |
|-------|-------------|
| Supabase RLS | Every table has row-level security — users only see their household's data |
| SECURITY DEFINER RPCs | Sensitive operations (`create_household`, `join_household`) run server-side |
| Cloudflare security headers | `X-Frame-Options`, `X-Content-Type-Options`, etc. (see `public/_headers`) |
| HTTPS | Enforced by Cloudflare on all traffic |
| Supabase rate limiting | Built-in auth rate limiting prevents brute force |
| Disabled sign-ups | After setup, no new accounts can be created |

The anon key in the client bundle is intentional and safe — it's Supabase's standard model. RLS policies enforce that the key can only access your household's data.

---

## Custom domain (optional)

In Cloudflare Pages → your project → **Custom domains** → add your domain.  
DNS is managed automatically if your domain is on Cloudflare.
