# Meal Tracker

A mobile-first meal logging app: daily diary by meal, calorie & macro targets,
voice/dictated smart logging with nutrition estimates, meal photos, streaks,
history & trends charts, and CSV export.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase
(Postgres + Auth + Storage) · Recharts. Deploys on Vercel.

## Local development

```bash
cd meal-tracker-app
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev                  # http://localhost:3000
npm run build                # production build (must pass before deploy)
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor → New query**, paste the contents of
   `supabase/migrations/0001_init.sql`, and run it. This creates:
   - `profiles` — per-user calorie/protein/carb/fat targets (auto-created on signup via trigger)
   - `meals` — one row per user/date/meal-type
   - `meal_items` — the logged foods (name, quantity, calories, protein/carbs/fat, photo path, notes)
   - `favorites` — saved foods for quick add
   - Row Level Security policies so users only ever touch their own rows
   - the private `meal-photos` storage bucket + per-user storage policies
3. **Authentication → Sign In / Sign Up:** enable **Email** provider. Magic
   (OTP) links are on by default — no extra config needed. Under
   **Authentication → URL Configuration**, add your production URL
   (e.g. `https://your-app.vercel.app`) to **Redirect URLs** so the magic link
   can return to `/auth/callback`.
4. Copy your **Project URL** and **anon public key** from
   **Project Settings → API** into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` is optional (only for admin scripts; the app never uses it).

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In [vercel.com](https://vercel.com) → **Add New → Project → Import** the repo.
   Framework preset is detected automatically (Next.js).
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (`SUPABASE_SERVICE_ROLE_KEY` only if you need it)
4. **Deploy.** No build settings changes needed (`npm run build`).

After deploy, add the Vercel URL to Supabase **Redirect URLs** (step 3 above)
so magic-link sign-in works in production.

## How it works

- **Auth:** passwordless email magic link. `proxy.ts` (Next.js 16's renamed
  `middleware`) refreshes the Supabase session on every request and redirects
  unauthenticated visitors to `/login`.
- **Data:** all reads/writes go through the browser Supabase client; Postgres
  RLS guarantees per-user isolation.
- **Photos:** uploaded to the private `meal-photos` bucket at
  `{user_id}/{meal_id}/{uuid}.jpg`; the UI renders them via short-lived signed
  URLs (1h expiry), batched per view.
- **Smart log:** free text or voice dictation (Web Speech API) is parsed
  locally against a built-in nutrition database (`lib/foods.ts`,
  `lib/parse.ts`). Every result is shown as an *estimate* with its assumptions
  and is fully editable before saving.
- **History:** day/week/month ranges with calorie-vs-target bars, macro trend
  lines, period summaries, per-day drill-down into the diary, and CSV export.

## Project layout

```
app/                    routes: /diary /history /photos /settings /login /auth/callback
components/             UI: diary, entry modal, smart entry, quick add, charts clients
lib/                    supabase clients, data access, nutrition DB + parser, utils
supabase/migrations/    SQL schema, RLS, storage bucket
proxy.ts                auth gate + session refresh (Next 16 proxy convention)
```
