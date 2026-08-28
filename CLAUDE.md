# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Frontend for **tag2now** — a live info dashboard for **Tekken Tag Tournament 2 (TTT2)**. Shows active online rooms, leaderboard rankings, player activity statistics, and a community board, all sourced from the `tag2now-BE` API.

UI text is in Korean. The visual style is a dark neon arcade theme.

## Commands

```bash
npm run dev          # dev server on :5173 (host 0.0.0.0), proxies /api
npm run build        # production build → dist/
npm test             # vitest run (unit/component, once)
npm run test:watch   # vitest watch mode
npm run test:coverage  # v8 coverage
npm run typecheck    # tsc --noEmit
npm run test:e2e     # playwright (auto-starts the dev server)
npm run test:e2e:ui  # playwright UI mode
npm run test:e2e:update-snapshots  # refresh visual baselines
```

Run a single unit test file:
```bash
npx vitest run src/match/Rooms.test.tsx
```

Run a single E2E spec:
```bash
npx playwright test e2e/specs/rooms.spec.ts
```

### Dev proxy target

`vite.config.ts` proxies `/api` to **production by default** (`https://match.tag2now.click/api`). To hit a local backend, set `BE=local`:

```bash
BE=local npm run dev
```

The proxy strips the `/api` prefix before forwarding.

## Stack

React 19 + TypeScript + Vite 8 (rolldown) + Tailwind CSS 4. No router — a single page with tab state. No global state library; state lives in hooks.

Key dependencies: `recharts` (statistics charts), `react-hot-toast` (notifications).

The `@` alias resolves to `src/` and is configured in both `vite.config.ts` and `tsconfig.json`. Prefer `@/shared/util/api` over relative paths.

## Architecture

**Feature-folder layout.** Each feature owns its components, hooks, types, and API calls; `shared/` holds what crosses features.

```
src/
  App.tsx              tab state and layout; the only place tabs are assembled
  main.tsx             root render, Toaster, global unhandledrejection handler
  index.css            Tailwind 4 @theme design tokens
  config/              tabConfig, version, test-setup
  match/               rooms — useRooms, Rooms, RankMatchTable, PlayerMatchTable
  community/           board — useCommunity, communityApi, post/comment components
  stat/                statistics — useStats, useWeeklyTop, Stats
  shared/              api util, Leaderboard, hooks, components, colors, formatters
```

A feature folder holds `<Feature>.tsx` (container), `use<Feature>.ts` (state), `types.ts`, and a `component/` subfolder with an `index.ts` barrel re-export.

### Data flow

`shared/util/api.ts` is the only place `fetch` is called. `GET`/`POST`/`DELETE` prepend the base URL, send `credentials: 'include'` (required for the community identity cookie), and throw on non-2xx.

The base URL is `window.__ENV__?.API_BASE ?? '/api'`, letting a deployed build override the endpoint at runtime without a rebuild.

**Polling** is centralised in `shared/hooks/usePolledData.ts`. It returns `{ data, loading, refreshing, error, refresh, lastUpdated }` and distinguishes first load (`loading`) from background refresh (`refreshing`) so the UI does not blank out on every poll. Feature hooks are thin wrappers:

```ts
export default function useRooms(): PolledState<RoomsData> {
  return usePolledData(fetchRoomsAll, ROOMS_REFRESH_INTERVAL)  // 5s
}
```

Pass `null` as the interval to fetch once without polling.

`App.tsx` owns `useLeaderboard()` and `useRooms()` and passes `{ data, loading, error, onRefresh }` down. Both data sets stay fresh regardless of the active tab — switching tabs is display-only.

### Tabs

The tab strip is **fixed layout, not derived from the response**: one tab per key in `GROUP_ORDER` (`config/tabConfig.ts`) — always rendered, even before rooms load or after the fetch fails — plus any unknown group the API returns appended after them, followed by the fixed `reservation`, `leaderboard`, `community`, and `stats` tabs. `tab` state is `string | null`; when null or stale it falls back to the first tab, which is therefore always `rank_match`.

Room data affects only the **count in the label**, never which tabs exist. Until the first successful load the count renders as `(—)` rather than `(0)`, so a pending or failed fetch is not mistaken for "no rooms"; afterwards a group the payload omits is genuinely `(0)`.

Do not gate room tabs on the rooms response. Doing so made the tab strip shift during load, silently moved the default tab to `reservation`, and required a fallback that rendered the rooms error panel on top of unrelated tabs.

The tab bar implements the ARIA tabs pattern — `role="tablist"`/`tab`/`tabpanel`, roving `tabIndex`, and Arrow Left/Right navigation. Preserve this when touching the nav.

### Community identity

Not authentication. The username is stored in a cookie (`shared/util/cookie.ts`) and registered with the backend via `useIdentity().ensureIdentity()`, which POSTs to `/community/identity` once per session (guarded by a `useRef`) before any write. Callers must `await ensureIdentity()` before posting; it throws a Korean error message if no username is set.

### Reservation ownership

Reservations use **capability tokens in `localStorage`**, not the community cookie identity. Creating one stores `reservation-owner-{id}`; joining stores `reservation-participant-{id}`. Both are sent back as `X-Reservation-Token` on the matching `DELETE`, and the backend authorises by comparing token hashes — there is no account to check against.

`isOwner(id)` / `hasParticipation(id)` therefore answer "does this browser hold the token", not "is this the same person". Clearing site data or switching browsers loses the ability to delete a reservation, and nothing in the UI can recover it. Treat that as a known limitation of the token model rather than a bug to patch around.

Editing (`PATCH /reservations/{id}`) is refused once anyone has joined: participants agreed to the conditions as they stood, and letting the host move the time underneath them would bind people to an appointment they never accepted. The host cancels and re-posts instead. The edit button is disabled once `participant_count > 0` so the host sees the restriction before acting, but the server stays the authority — a participant arriving while the editor is already open is caught by the 400, not by the disabled state. The create modal doubles as the edit form — same fields, same validation — so a rule cannot drift between posting and editing.

Cancelling is a soft delete (`status = 'cancelled'`) that also releases every participant. `GET /reservations` returns only `open` and `matched`, so a cancelled reservation disappears on the next poll without any client-side removal.

### Error handling

`main.tsx` registers a global `unhandledrejection` handler that shows a toast and calls `preventDefault()`. Rejected promises therefore surface to the user without a try/catch at every call site — but a caller that wants inline error state (as feature hooks do) must catch and store `e.message` itself.

`shared/util/panelStatus.tsx` renders shared loading/error/empty panel states.

## Styling

Tailwind CSS 4 with the CSS-first config — there is no `tailwind.config.js`. Design tokens are declared in an `@theme` block in `src/index.css` and become utilities automatically (`--color-primary` → `bg-primary`, `text-primary`, `border-primary`).

Use tokens rather than raw hex or arbitrary values. Fonts are Rajdhani (`--font-sans`) and Orbitron (`--font-display`), loaded from Google Fonts in `index.css`.

Rank/tier and medal colours live in `shared/tierColors.ts` and `shared/medalColors.ts`; character art paths in `shared/characterImage.ts`.

## Tests

Two independent suites.

**Unit / component — Vitest + Testing Library.** Tests sit beside the code they cover (`src/**/*.test.tsx`), jsdom environment, globals enabled, `src/config/test-setup.ts` imports `@testing-library/jest-dom`. `vitest.config.ts` merges `vite.config.ts`, so the `@` alias works in tests.

Component tests are prop-driven and need no mocks. `App.test.tsx` mocks the feature hooks. When testing polling, use `vi.useFakeTimers()` and always restore with `vi.useRealTimers()` in `afterEach`, so a mid-test failure cannot corrupt later tests.

**E2E — Playwright**, in `e2e/`, against two projects: `chromium` (Desktop Chrome) and `mobile` (Pixel 5). The config starts `npm run dev` automatically and reuses a running server outside CI.

- `e2e/helpers/mock-api.ts` — route interception; E2E does not hit a real backend.
- `e2e/specs/` — behavioural specs per feature.
- `e2e/visual/screenshots.spec.ts` — visual regression against committed baselines.

Visual baselines are environment-sensitive: snapshots rendered on Windows will not match CI's Linux. Refresh them with the `Update Visual Baselines` workflow (`workflow_dispatch`) and commit the artifact rather than regenerating locally.

## Custom commands

`.claude/commands/` provides `/a11y-audit`, `/design-audit`, `/design-review`, and `/version-up`.

Note that `/version-up` refers to `src/version.ts`, but the file is actually at `src/config/version.ts` — fix the path in the command or the version bump will fail.

## Deployment

Docker multi-stage: `node:24-alpine` builds the SPA, `nginx:alpine` serves `dist/`. `nginx.conf.template` is rendered by nginx's envsubst with `BACKEND_URL` (filtered to the `BACKEND` prefix), proxying `/api/` to the backend.

Caching in nginx: hashed `/assets/` are immutable for a year; `index.html` is `no-cache` so deploys take effect immediately.

Images go to ECR (`864573346741.dkr.ecr.ap-northeast-2.amazonaws.com/tag2-now/fe`). Production is a **single AWS Lightsail instance** running docker compose alongside the backend and its datastores — not ECS. CloudFront fronts the static assets only; `/api/` reaches the instance directly.

| Workflow | Trigger | Does |
|----------|---------|------|
| `test.yml` | PR to `dev`/`master` | unit tests + typecheck, then E2E |
| `deploy.yml` | `v*` tag | full test suite, build and push to ECR, then deploy to production over SSH |
| `update-snapshots.yml` | manual | regenerate visual baselines, upload as artifact |

**Release is automatic on a `v*` tag.** The `deploy` job SSHes into Lightsail,
writes `FE_IMAGE_TAG` into the instance's `.env.prod`, and restarts **only
`fe`** — `be` and the datastores are left alone, and are released independently
by the backend repo.

`compose.prod.yml` lives in **tag2now-BE** and describes the whole stack,
including this service's image. A change to how `fe` runs in production belongs
in that repo.

The SSH and ECR settings are **org-level** secrets/variables on the `tag2now`
org, shared with tag2now-BE; this repo defines only `ECR_REPOSITORY`
(`tag2-now/fe`) and its own `production` environment. See
[aws-setup.md](../tag2now-BE/docs/aws-setup.md#actions-configuration).

## Analytics

Google Analytics (`G-S4Y67MPNPR`) is loaded via a gtag snippet in `index.html`. Device category and OS are collected automatically by Enhanced Measurement — no per-event code. Check *Reports → Tech → Tech details* before adding custom tracking.

Because the SPA has no router, GA4 records one `page_view` per load; tab switches are not tracked.

The CloudFront distribution is on the **Free plan**, where standard and real-time access logging are locked behind paid tiers, so the S3 → Athena pipeline described in `aws-setup.md` cannot currently be enabled. GA4 is the only source actually collecting.
