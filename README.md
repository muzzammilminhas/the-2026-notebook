# The 2026 Notebook

A live FIFA World Cup 2026 prediction notebook inspired by the handwritten
group tables and knockout simulations I kept during Qatar 2022.

## Live Product

The production site is deployed with GitHub Pages:

https://muzzammilminhas.github.io/the-2026-notebook/

![The 2026 Notebook desktop interface](public/screenshots/notebook-desktop.png)

## What It Does

- `Actual` is read-only and follows official FIFA scores.
- `What if` accepts score predictions only before kickoff.
- A real result automatically replaces the prediction in standings and paths.
- Group scoring: exact score `3`, correct outcome `1`, wrong `0`.
- Knockout scoring: correct advancing team `2`.
- All 12 groups, best third-place ranking, official Annex C routing, and the
  full Round of 32-to-final bracket are included.
- Anonymous Supabase accounts preserve predictions without collecting email
  addresses or requiring Google sign-in.
- A public leaderboard ranks players by total points.

## Reliability

One Supabase Edge Function polls FIFA's official competition feed centrally
every minute. Results are cached in Postgres, so visitors never call a sports
provider directly. Finished matches are marked verified, provider corrections
are audited, and prediction deadlines are enforced by database triggers using
the official kickoff timestamp.

The sync source is:

`https://api.fifa.com/api/v3/calendar/matches`

No paid API, advertising, payment flow, or user tracking is used.

## Stack

- React 19 and Vite
- Supabase Postgres, anonymous Auth, Row Level Security, Vault, Cron, and Edge
  Functions
- Vitest and ESLint
- GitHub Actions and GitHub Pages

## Local Development

```powershell
npm install
npm run dev
```

The frontend has the production Supabase publishable key as a safe fallback.
Local overrides can use:

```powershell
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"
$env:VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
npm run dev
```

## Verification

```powershell
npm run test
npm run lint
npm run build
```

Database changes are versioned under `supabase/migrations/`. The result worker
is under `supabase/functions/sync-results/`.

Tournament routing is based on the official
[FIFA World Cup 2026 Regulations](https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf).
