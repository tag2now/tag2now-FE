# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Live info dashboard for **Tekken Tag Tournament 2 (TTT2)** — displays real-time leaderboard rankings and active online rooms pulled from a game backend API.

## Commands

```bash
npm run dev          # dev server on :5173, proxies /api → http://localhost:8000
npm run build        # production build → dist/
npm test             # vitest run (all tests, once)
npm run test:watch   # vitest in watch mode
npm run test:coverage  # coverage report via v8
```

Run a single test file:
```bash
npx vitest run src/test/api.test.js
```

## Architecture

**Single-page app** — React 18 + Vite, no router. All state lives in `App.jsx`.

**Data flow:**
- `src/api.js` — two thin fetch wrappers: `fetchLeaderboard(top?)` and `fetchRoomsAll()`. Both call `/api/*`, which Vite proxies to `http://localhost:8000` in dev and nginx proxies to `http://ttt2-backend-svc:8000` in production (Docker).
- `src/App.jsx` — owns all async state as `{ data, loading, error }` objects for leaderboard and rooms. Fetches both on mount, auto-refreshes every 60 s via `setInterval`, and exposes a manual Refresh button. Tab switching is purely display — both data sets are always kept fresh.
- `src/components/Leaderboard.jsx` and `src/components/Rooms.jsx` — purely presentational, receive `{ data, loading, error }` as props and render table/loading/error states.

**Deployment:** Docker multi-stage build — Node builds the SPA, nginx serves static files and proxies `/api/` to the backend service named `ttt2-backend-svc`.

## Tests

Tests live in `src/test/`. `setup.js` imports `@testing-library/jest-dom` globally.

- `api.test.js` — mocks `global.fetch` with `vi.fn()` per test
- `Leaderboard.test.jsx` / `Rooms.test.jsx` — pure prop-driven rendering; no mocks needed
- `App.test.jsx` — mocks the entire `src/api.js` module via `vi.mock('../api')`. Uses `vi.useFakeTimers()` for auto-refresh tests; `afterEach` always calls `vi.useRealTimers()` so a mid-test failure can't corrupt subsequent tests.
