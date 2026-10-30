# Frontend testing

[Documentation index](../CLAUDE.md)

Paths and commands in prose are relative to the FE repository root unless linked otherwise.

Application behavior uses two independent suites.

**Unit / component — Vitest + Testing Library.** Tests sit beside the code they cover (`src/**/*.test.tsx`), jsdom environment, globals enabled, `src/config/test-setup.ts` imports `@testing-library/jest-dom`. `vitest.config.ts` merges `vite.config.ts`, so the `@` alias works in tests.

Test observable behavior through public components and hooks. Presentational
components can be tested with props; containers and fetching components use API
or hook mocks where appropriate. `App.test.tsx` mocks feature hooks. Do not test
private helpers directly. When testing polling, use `vi.useFakeTimers()` and
restore with `vi.useRealTimers()` in `afterEach` even if a test fails.

**E2E — Playwright**, in `e2e/`, against two projects: `chromium` (Desktop Chrome) and `mobile` (Pixel 5). The config starts `npm run dev` automatically and reuses a running server outside CI.

The E2E CI job explicitly uses Ubuntu 26.04 with Node 24. Playwright added support
for that OS in 1.61; keep the package and lockfile on a supported version when
changing the runner. After updating Playwright locally, run
`npx playwright install chromium` to install its matching browser. CI installs
both Chromium and its OS dependencies with `npx playwright install --with-deps chromium`.

- `e2e/helpers/mock-api.ts` — route interception; E2E does not hit a real backend.
  `mockAllApis` must route every endpoint the landing tab calls, the overview's
  history/community/reservation reads included; anything unrouted reaches
  whatever the dev server proxies to, which is **production** by default.
- `e2e/specs/` — behavioural specs per feature.
- `e2e/visual/tokens.spec.ts` — asserts a `color-mix` off a token rasterises to
  the same pixels as the literal it replaced. It compares computed colours
  through a canvas, not baseline images, so it runs anywhere.

Helpers worth reaching for: `goToMatchTab` (the overview is the landing tab, so
a rooms spec can click through or `goto('/match/rank_match')`) and
`skipPatchNotes`, which every spec calls **before its first navigation** — it
seeds the seen marker from `LATEST_PATCH_VERSION`, so a version bump cannot
silently stop suppressing the dialog.

`skipPatchNotes` registers an init script, so one call in a `beforeEach` holds
for every later `goto` and `reload` in that test. Do not repeat it per
navigation. `dismissPatchNotes` clicks the dialog's X instead, and the X writes
nothing — so it has to run again after every navigation, and a spec that
forgets leaves the modal covering whatever it asserts next. It is now used only
by `e2e/specs/patch-notes.spec.ts`, which is the one place the dialog itself is
under test; nothing else should reach for it.

**Do not wait out a poll in real time.** Install `page.clock` before the first
navigation and use `fastForward`, not `runFor`: `runFor` replays every timer
callback along the way, which measured 2.7s of the rooms auto-refresh test on
its own. `fastForward` jumps to the target instant — that test went 5.6s → 1.6s.

**There is no screenshot suite, deliberately.** `e2e/visual/screenshots.spec.ts`
and the `Update Visual Baselines` workflow were removed: its baselines were
gitignored, so nothing was tracked, CI could not run it, and every developer
compared against whatever their own machine last rendered. It never caught a
regression and went red on unrelated changes — a version string in the header
changing width was enough. At the end it failed 8 of 10 on an untouched
checkout.

Reinstating pixel comparison means solving the baseline problem first, not
re-adding `toHaveScreenshot`: commit Linux PNGs generated in a container and run
them in CI, or use a hosted service. A suite whose baselines live only on one
machine is worse than none, because it trains you to ignore a red run.

**Parallelism.** [playwright.config.ts](../playwright.config.ts) explicitly sets
four workers and one retry on CI. Locally it leaves workers to Playwright's
default and disables retries. Four is a configured concurrency choice, not a
statement about the runner's core count. Name failures from the first run and
use `npx playwright test --last-failed` to investigate a suspected flake.

## Verification workflow and current CI coverage

The [test workflow](../.claude/skills/test/SKILL.md) owns exact commands, log
capture and failure reporting. Read it when finalizing code changes or asked to
run tests, even when the workspace root's skill list does not expose it. Keep
each full suite's first output under `test-results/`; name failures from that
run and rerun only the affected check or failed tests as directed there.

For Markdown-only changes, validate local links, referenced paths and descriptions
against the source. Do not run the full app suite when no test consumes the changed
documents. Data files use the specific parser or test that reads them.

The [current CI workflow](../.github/workflows/test.yml) runs the boundary-policy
tests (`npm run test:architecture`), dependency-cruiser import boundaries
(`npm run lint:architecture`), unit/component tests, both TypeScript projects
(`npm run typecheck` and `npm run typecheck:e2e`), CSS lint and Playwright's
desktop/mobile projects. Policy tests use Node's built-in test runner, temporary
TypeScript projects and dependency-cruiser's public API/CLI. They protect the
project configuration and are separate from the application Vitest count.

The [boundary rules](architecture.md#import-boundaries) check resolved references,
including type-only dependencies and re-exports. They do not identify duplicate
components or automatically prove that an existing component was reused.
