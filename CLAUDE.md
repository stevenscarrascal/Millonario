# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Cumplimiento" (branded around "El Reto Internacional") is a marketing site + gamified
compliance-training app, built on [vinext](https://github.com/cloudflare/vinext) (Next.js App
Router running on Vite) as a **plain Node.js server** — deployed to a VPS (CloudPanel), not
Cloudflare Workers. Spanish is the UI language throughout; keep new copy in Spanish to match.

Note: this repo was originally scaffolded from a Cloudflare-Workers-flavored vinext starter
(built for OpenAI's Sites/ChatGPT-Apps hosting). It has since been de-integrated from that
platform — Cloudflare D1/R2 bindings, `worker/index.ts`, `.openai/hosting.json`, and the unused
`oai-authenticated-user-*` ChatGPT-sign-in helper are gone. If you see references to any of that
in old commits/docs, it's historical — don't reintroduce it.

## Commands

Package manager is pnpm (`packageManager: pnpm@11.9.0`).

- `pnpm run dev` — start local dev (vinext + Vite)
- `pnpm run build` — build the Node production bundle (`dist/`)
- `pnpm run start` — run the built app with `vinext start` (plain Node HTTP server;
  respects `PORT`, defaults to 3000)
- `node_modules/.bin/tsc --noEmit` — **the actual type-check.** `pnpm run build` (`vinext build`)
  is Vite/esbuild-based and strips TypeScript types without checking them — it will happily
  "succeed" on code with real type errors (e.g. a component passed props it doesn't declare).
  Run `tsc --noEmit` separately whenever you need to know if the types actually line up.
- `pnpm run lint` — `eslint . --ignore-pattern dist --ignore-pattern .next`
- `pnpm run db:generate` — regenerate Drizzle migrations under `drizzle/` after editing `db/schema.ts`

There is no test suite currently (the previous `tests/rendered-html.test.mjs` asserted on
starter-template scaffolding — a "Your site is taking shape" loading skeleton — that no longer
exists now that `app/page.tsx` is the real marketing page; it was removed rather than fixed).

## Architecture

### Two separate data stores — don't conflate them

- **Supabase (Postgres)** handles auth and business/account data: `app/login/actions.ts` and
  `lib/supabase/{client,server}.ts` wrap `@supabase/ssr`. The `/panel` dashboard
  (`app/panel/page.tsx`) reads `profiles` and `organizations` tables and calls an RPC
  `activate_preview_plan` — this schema is NOT managed by Drizzle/`db/schema.ts` (that's the
  SQLite side only). It lives in `supabase/schema.sql`, which must be run manually against the
  Supabase project's SQL Editor (there's no automatic migration runner for it — see README). This
  file was reverse-engineered from the app's own usage after the original Supabase project
  disappeared with an uncommitted schema; if you change how `/panel` or signup use
  profiles/organizations/the RPC, update `supabase/schema.sql` to match, or the two will drift.
  Plan activation in the dashboard is a no-payment "preview mode" stub (see `dashboard-client.tsx`),
  not a real billing integration.
- **Local SQLite** (`data/app.db`, via `better-sqlite3` + Drizzle) stores marketing-funnel data:
  `leads`, `participants`, `subscribers` — defined in `db/schema.ts`. `db/index.ts` exposes a
  singleton `getDb()` that lazily opens the file (creating `data/` if needed), enables WAL mode,
  and bootstraps the three tables with idempotent `CREATE TABLE IF NOT EXISTS` on first call —
  so a fresh VPS deploy doesn't need a separate migration step to start accepting writes.
  `app/api/leads/route.ts`, `app/api/participants/route.ts`, and `app/api/subscribers/route.ts`
  all go through `getDb()` + Drizzle inserts. `data/` is gitignored and must persist on the
  server (back it up) — it is not created by `pnpm run build`, only by the app's first write.
- `better-sqlite3` is a native addon and is listed in `next.config.ts`'s `serverExternalPackages`
  — it must stay a live `require()` at runtime rather than get bundled into the server chunk, or
  its `__dirname`-based binary lookup breaks under the ESM bundle (`ReferenceError: __filename is
  not defined`). If you add another native/binary npm dependency, it likely needs the same
  treatment.
- `pnpm-workspace.yaml` (`allowBuilds`) pre-approves the native postinstall/install scripts this
  project needs (`better-sqlite3`, `esbuild`, `sharp`, `unrs-resolver`) so `pnpm install` doesn't
  block on pnpm's script-approval gate on a fresh machine (e.g. the VPS). If you add a dependency
  with a native build step, you'll likely need to add it here too (`pnpm approve-builds <pkg>`).

### Deployment target: Node, not Cloudflare Workers

- `vite.config.ts` is intentionally minimal — just the `vinext()` plugin. There is no
  `@cloudflare/vite-plugin`, no Worker entry file, and no D1/R2 binding config. `vinext build` /
  `vinext start` behave like a drop-in `next build` / `next start` when no Cloudflare plugin is
  configured (it's vinext's native Node mode, not a hack).
- Image optimization (`/_vinext/image`) is handled internally by vinext's Node production server
  — there is no custom worker/server entry file in this repo.
- See `README.md` for the actual CloudPanel deployment steps (Node.js site type, app port,
  `pnpm run build` + `pnpm run start` as the startup command).

### App structure

- `app/page.tsx` — public marketing landing page (client component; themes, benefits, embedded
  demo quiz, pricing).
- `app/juego/page.tsx` — the actual game ("El Reto Internacional"), a client-rendered
  Who-Wants-to-Be-a-Millionaire-style quiz. Question content lives in two places: inline
  `questions` array in `page.tsx` and `app/question-bank.ts` (`extraQuestions`, tiered 1–5 by
  difficulty with `id`/`tier`/`category`/`source`/`explanation`). When adding questions, follow the
  existing `BankQuestion` shape and keep `correct` as an index into `answers`.
- `app/login/page.tsx` + `app/login/actions.ts` — combined login/signup form (mode switched via
  `?mode=signup` query param, not separate routes); server actions call Supabase auth directly.
- `app/panel/page.tsx` (server) + `app/panel/dashboard-client.tsx` (client) — authenticated
  dashboard; tabs are client-side state (`Tab` union), not separate routes.
- `app/theme-toggle.tsx` — light/dark theme is a manual `data-theme` attribute on `<html>`
  persisted to `localStorage` (`cumplimiento-theme`), set via an inline blocking script in
  `app/layout.tsx` to avoid FOUC. It's not using `prefers-color-scheme` or a CSS-only approach.
- Styling is a single global stylesheet (`app/globals.css`); components use plain class names,
  no CSS modules/Tailwind classes in JSX despite `tailwindcss`/`@tailwindcss/postcss` being a
  devDependency (Tailwind is wired into the PostCSS pipeline but not used in the reviewed pages —
  verify before assuming a utility-class approach is idiomatic here).

### Environment

Supabase config comes from `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`); no server-only Supabase secret is
used in this repo (auth uses the publishable key via `@supabase/ssr`, matching cookie-based SSR
sessions). `PORT` and `SQLITE_DB_PATH` are optional runtime env vars for the Node server (see
`README.md`).
