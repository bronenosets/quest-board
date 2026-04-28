# Quest Board

A gamified, RPG-themed family task tracker. Parents create quests (chores, homework, music practice…); kids ("heroes") complete them, submit for approval, earn XP, gold, and money; spend gold in the loot shop on rewards parents pre-approve. Real-time sync across every family member's device.

**Stack:** Next.js 15 (App Router) · React 19 · Supabase (Postgres + Auth + Realtime) · Tailwind · Framer Motion · TanStack Query · Vercel.

---

## What's in the box

```
quest-board/
├── README.md                     ← you are here
├── package.json
├── supabase/
│   └── migrations/
│       └── 0001_initial.sql      ← schema, RLS policies, RPCs, seed
└── src/
    ├── app/                      ← Next.js routes
    │   ├── login/                  magic-link login
    │   ├── auth/callback/          OAuth/OTP exchange
    │   ├── onboarding/             create or join a household
    │   └── app/
    │       ├── hero/               hero (kid) dashboard
    │       └── parent/             parent dashboard
    ├── components/                 UI primitives + feature components
    ├── hooks/                      data hook with realtime subscriptions
    ├── lib/                        supabase clients, types, utils, mutations
    └── middleware.ts               auth gate
```

---

## Deploy in ~25 minutes

### 1. Push to GitHub

```bash
cd quest-board
git init
git add .
git commit -m "initial"
gh repo create quest-board --private --source=. --remote=origin --push
# or: create the repo in github.com UI, then:
# git remote add origin git@github.com:you/quest-board.git
# git push -u origin main
```

### 2. Create the Supabase project

1. Go to <https://supabase.com> → **New project**.
2. Pick a name (e.g. "quest-board"), generate a strong DB password, choose a region near you.
3. Wait ~1 minute for the project to provision.

### 3. Run the migration

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Open `supabase/migrations/0001_initial.sql` from this repo, copy its entire contents, paste into the SQL Editor.
3. Hit **Run**. You should see `Success. No rows returned`.

> Re-running the migration is safe — it's idempotent.

### 4. Configure email (magic links)

By default Supabase ships a sign-in email template that works out of the box on the free tier (rate-limited to a few per hour, fine for family setup). If you want production-grade email:

- **Settings → Authentication → SMTP Settings** — plug in any SMTP provider (Resend, SendGrid, Postmark, your Gmail). Free tiers from Resend (~3k/mo) and Postmark are more than enough.

In **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` while developing locally; later change to your production URL like `https://questboard-yourname.vercel.app`.
- **Redirect URLs:** add both `http://localhost:3000/auth/callback` and `https://YOUR-PROD-DOMAIN/auth/callback`.

### 5. Grab your env vars

Supabase split this across two pages and renamed the keys (the new `publishable`/`secret` keys replace the old `anon`/`service_role` names — they're drop-in compatible with `@supabase/ssr`):

- **Project URL** → **Settings → Data API** → copy `Project URL`. Goes in `NEXT_PUBLIC_SUPABASE_URL`.
- **Publishable key** → **Settings → API Keys** → "Publishable key" section → copy the value (starts with `sb_publishable_...`). Goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Safe to expose client-side; RLS is what protects your data.
- **Secret key** → **Settings → API Keys** → "Secret keys" section → copy the value (starts with `sb_secret_...`). Goes in `SUPABASE_SERVICE_ROLE_KEY`. *Server-only; treat as a password, never commit to git, never expose client-side. Not strictly required for current functionality but keep it for future server actions.*

> The variable names in the code (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) keep the older Supabase nomenclature, but you paste the new `sb_publishable_...` and `sb_secret_...` values into them. No code changes needed.

### 6. Local dev (optional)

```bash
cp .env.example .env.local
# paste the values from step 5
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in with your email, you'll see the magic link in your inbox.

### 7. Deploy to Vercel

1. Go to <https://vercel.com> → **Add New → Project**.
2. **Import** your `quest-board` GitHub repo.
3. Framework Preset auto-detects as **Next.js**. Leave defaults.
4. **Environment Variables** — add the three from step 5, plus:
   - `NEXT_PUBLIC_SITE_URL=https://YOUR-VERCEL-DOMAIN` (you'll know this after first deploy — re-deploy after adding it)
5. **Deploy**.

After the first deploy:

- Note the URL (e.g. `quest-board-abc.vercel.app`).
- Update `NEXT_PUBLIC_SITE_URL` to that URL → **Redeploy** (Deployments tab → ⋯ → Redeploy).
- Add the same URL to Supabase **Authentication → URL Configuration** as both Site URL and a Redirect URL (with `/auth/callback` appended).

### 8. First run

1. Open the deployed URL → sign in with your email → click the magic link.
2. **Onboarding → Start a new family** — name it, pick your avatar, leave "seed starter quests" checked.
3. **Settings → copy the invite code** — share it with your spouse / your daughter.
4. Each family member opens the same site, signs in with **their own** email, picks **Join with invite code**, pastes the code, picks role + display name + avatar.
5. Done. Parents land on the parent dashboard, heroes on the hero dashboard.

---

## Daily flow

**Hero (kid):** Opens the site → Today's Quests tab → taps "Mark complete" on each finished quest → optionally adds a note. The quest moves into "Awaiting approval".

**Parent:** A red badge appears on the Approvals tab. Tap → review → "Approve" awards XP, gold, money, and updates streaks. Recurring quests auto-reset for the next day/week.

**Loot shop:** Hero "buys" a reward with gold (gold is deducted immediately). Parent sees it in Approvals → Approve (gives the reward IRL, marks redeemed) or Decline (refunds gold).

---

## How the security works

Every database row carries a `household_id`. Row-Level Security policies enforce: *"a row is visible/editable only if the calling user is a member of that household."* Mutations that need cross-cutting logic (approve quest, purchase, etc.) go through `SECURITY DEFINER` Postgres functions that re-check the caller's role server-side.

This means: even if someone reverse-engineered the client and tried calling the database directly, they couldn't read another family's data, approve their own quests, or buy without spending gold. All enforced in the database.

---

## Customizing

- **Reward economy** — edit XP/gold/money values per quest in the parent dashboard. Or change the level curve in `src/lib/utils.ts` (currently `level * 100` XP per level).
- **Achievements** — add new ones in `src/lib/achievements.ts`. They auto-unlock on the next data refresh after the condition is met.
- **Starter quests/rewards** — edit the `seed_starter_data()` function at the bottom of `supabase/migrations/0001_initial.sql` and re-run that one function in the SQL editor.
- **Theme/colors** — `tailwind.config.ts` and `src/app/globals.css`.

---

## Adding a sibling later

The schema already supports multiple heroes per household. The current UI shows the first hero's stats in the parent topbar; the parent dashboard's quest form lets you assign quests to specific heroes when more than one exists. To fully expose multi-kid in the parent UI (per-hero stats tabs, etc.), the changes are isolated to `src/app/app/parent/page.tsx` and `src/components/topbar.tsx` — most of the wiring is already there.

---

## Backups

Supabase free tier includes daily backups for 7 days. For longer retention or self-managed backups:

- **Project Settings → Database → Backups** to download manual snapshots.
- Or run `pg_dump` against the connection string under **Project Settings → Database → Connection string**.

---

## Costs at family scale

- Supabase free tier: 500 MB DB, 2 GB file storage, 50k MAU, 5 GB bandwidth/mo. Family will use <1% of this.
- Vercel Hobby: 100 GB bandwidth/mo, unlimited deployments. Same — way under.
- Email magic links: free Supabase quota covers a family. Add Resend later if you want.

**Total monthly cost: $0.** Forever, at this scale.

---

## Troubleshooting

**"Invalid login credentials" / link expired** — magic links expire after 1 hour. Just hit "Send magic link" again.

**Hero dashboard shows blank** — check browser console. Most likely the migration didn't fully run; re-paste it in the SQL editor.

**Real-time updates not arriving** — check **Database → Replication** in Supabase: `quests`, `purchases`, `heroes` should be in the `supabase_realtime` publication. The migration adds them automatically; if it didn't, re-run the relevant `alter publication` block.

**Parent and hero see different things** — that's correct! RLS is doing its job. Each user only sees their own household.

**"No household" error after signing in** — the user is authenticated but never went through onboarding. Visit `/onboarding` to create or join a household.

---

## Future ideas

- Push notifications when a quest is submitted / approved (Supabase webhooks → web push).
- Photo proof attachment using Supabase Storage.
- Per-hero board pages so siblings each get their own URL.
- Weekly digest email to parents.
- A small native iOS/Android wrapper using Capacitor for an "app on the home screen" feel.
