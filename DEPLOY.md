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
2. Go to **SQL Editor → New query**, paste the entire contents of **`supabase/setup.sql`**, and click **Run**  
   *(This creates all tables, RLS policies, triggers, and functions in one shot. Safe to re-run.)*
3. Go to **Authentication → Settings**:
   - Turn **off** "Enable email confirmations" (makes sign-in instant)
4. Note your credentials from **Project Settings → API**:
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

## Step 3 — Edge Function (invite by email)

The invite-by-email feature runs as a Supabase Edge Function.

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log in:
   ```bash
   npm install -g supabase
   supabase login
   ```
2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
3. Deploy the Edge Function:
   ```bash
   supabase functions deploy invite-member
   ```
4. Set the `SITE_URL` secret:
   ```bash
   supabase secrets set SITE_URL=https://your-project.pages.dev
   ```
   *(Or set it in Supabase Dashboard → Edge Functions → invite-member → Secrets)*

---

## Step 4 — First-time setup

1. Open your deployed URL
2. Click **Sign up** — enter your name, email, and a strong password
3. Name your household
4. You're in

To add family members (two options):
- **By email (recommended):** Settings → Invite by email — they get a link, click it, done
- **By ID:** Settings → copy Household ID → share it — they paste it on the Join screen

---

## Step 5 — Lock it down (important)

After everyone has joined, disable new sign-ups so no one else can create accounts:

**Supabase → Authentication → Settings → "Disable sign-ups" → Save**

Existing accounts still work normally.

---

## Automatic migrations via GitHub Actions (optional)

This repo includes a GitHub Actions workflow that automatically applies new database migrations whenever you push to `main`. To enable it, add these three secrets to your GitHub repo (**Settings → Secrets and variables → Actions**):

| Secret | Where to find it |
|--------|-----------------|
| `SUPABASE_PROJECT_REF` | Supabase Dashboard → Project Settings → General → Reference ID |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | The password you set when creating the Supabase project |

Once set, any new file added to `supabase/migrations/` and pushed to `main` will be applied automatically. No manual SQL editor needed.

---

## Security model

| Layer | What it does |
|-------|-------------|
| Supabase RLS | Every table has row-level security — users only see their household's data |
| SECURITY DEFINER RPCs | Sensitive operations run server-side and verify `auth.uid()` |
| Edge Function auth | Invite function verifies the caller is an admin before sending |
| Cloudflare security headers | `X-Frame-Options`, `X-Content-Type-Options`, etc. (see `public/_headers`) |
| HTTPS | Enforced by Cloudflare on all traffic |
| Supabase rate limiting | Built-in auth rate limiting prevents brute force |
| Disabled sign-ups | After setup, no new accounts can be created |

The anon key in the client bundle is intentional and safe — Supabase's standard model. RLS policies ensure it can only access your household's data.

---

## Custom domain (optional)

Cloudflare Pages → your project → **Custom domains** → add your domain.  
DNS is managed automatically if your domain is on Cloudflare.
