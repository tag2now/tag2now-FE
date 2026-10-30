# CLAUDE.md

Start with [AGENTS.md](AGENTS.md) for the working agreement and required reuse review. This file is the project entry point for Claude Code and other contributors.

## Project

Frontend for **tag2now** — a live info dashboard for **Tekken Tag Tournament 2 (TTT2)**. Shows active online rooms, leaderboard rankings, player activity statistics, and a community board, all sourced from the `tag2now-BE` API.

UI text is in Korean. The visual style is a black + red arcade theme.

## Commands

```bash
npm run dev          # dev server on :5173 (host 0.0.0.0), proxies /api
npm run build        # production build → dist/
npm test             # vitest run (unit/component, once)
npm run test:watch   # vitest watch mode
npm run test:coverage  # v8 coverage
npm run test:architecture  # project boundary-policy tests
npm run lint:architecture  # dependency-cruiser import boundaries
npm run typecheck    # tsc --noEmit
npm run typecheck:e2e  # E2E TypeScript project
npm run lint:css     # stylesheet token rules
npm run test:e2e     # playwright (auto-starts the dev server)
npm run test:e2e:ui  # playwright UI mode
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

PowerShell equivalent:

```powershell
$env:BE = 'local'
npm run dev
```

### Running from a worktree

Just run `npm run dev` from the worktree. Do not pass `--port`, do not add a
`.claude/launch.json`, and do not stop a dev server that is already on :5173 —
it is most likely the one the user is working in. Vite takes the next free port
by itself and prints the URL it settled on; read that line instead of assuming
:5173.

If a server serves the wrong checkout, check its working directory and printed
URL before starting another one. Do not infer the checkout from the port alone.

## Stack

React 19 + TypeScript + Vite 8 (rolldown) + Tailwind CSS 4 + React Router 7. No global state library; state lives in hooks.

Key dependencies: `recharts` (statistics charts), `react-hot-toast` (notifications).

The `@` alias resolves to `src/` and is configured in both `vite.config.ts` and `tsconfig.json`. Prefer `@/shared/util/api` over relative paths.

## Comments

A comment says in one line --- two at most --- *why* the code is as it is, when
the code cannot say it. Not what the code does, and not its history: "used to",
"before this", "changed because" belong in the commit message. Anything longer
goes in the relevant document under `docs/`.

## Documentation

| Document | Owns |
|----------|------|
| [AGENTS.md](AGENTS.md) | Planning, reuse review, verification and Git rules |
| [Reuse search guide](docs/reuse.md) | Finding current implementations and consumers; deciding reuse, extension or local ownership |
| [Architecture](docs/architecture.md) | Current folders, data ownership, routing and feature behavior |
| [Styling](docs/styling.md) | Tokens, stylesheet ownership, cascade and responsive behavior |
| [Testing](docs/testing.md) | Unit/E2E patterns and links to the test workflow |
| [Test workflow](.claude/skills/test/SKILL.md) | Exact full-suite commands and failure reporting |
| [Operations](docs/operations.md) | Build, deployment, versioning and analytics integration |
| [Tailwind migration](docs/tailwind-migration.md) | Migration decisions and remaining stylesheet work |

Keep each explanation in its owning document and link to it from other pages.
Update documentation when architectural decisions, routes, data flow, commands or
stylesheet ownership change. Component props and consumer lists stay in source;
adding a component does not require a documentation entry. Describe current
behavior separately from planned refactoring.

## Custom commands

[Accessibility audit](.claude/commands/a11y-audit.md), [design audit](.claude/commands/design-audit.md), and [design review](.claude/commands/design-review.md) follow the reuse search guide and inspect the current source. `.claude/skills/` also holds the test workflow and patch-notes workflow.
