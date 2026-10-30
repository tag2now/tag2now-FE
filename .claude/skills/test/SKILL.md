---
name: test
description: Run tag2now-FE's whole test suite before offering a commit — this repository's checks in CI's order — and report every step with its counts and the name of every failure. Use whenever a code change here is ready to commit, or when asked to run the tests, the E2E suite, or "everything". Not for a data- or docs-only change (a manifest field, a patch-notes entry, markdown) — that gets only the check that reads it.
---

# test — the whole frontend suite

Run this before offering a commit.

## Once per commit, not once per edit

The whole suite takes about five minutes, three and a half of them E2E. Run it
**once**, when the change is final and a commit is about to be offered --- not
after each edit, and not after a rename. Running it three times for one
feature, once after a purely mechanical rename, turned every small request into
ten minutes of waiting.

While a change is still moving, check only what it touches:

```bash
npm run typecheck
npx vitest run src/path/to/Changed.test.tsx
npx playwright test e2e/specs/changed.spec.ts
```

Seconds each. If an edit lands after the full run, re-run only what that edit
touches, unless it changed something many screens share (`App.tsx`,
`shared/util/api.ts`, `e2e/helpers/mock-api.ts`, a global sheet).

**Report honestly.** Give pass/fail counts for every step you ran, name any step
you skipped and why, and for anything red name each failing test and paste its
error. A step that errored for an environment reason is not a pass.

## Capture first, read second

Every step writes its whole output to a file under `test-results/` (gitignored,
and not Playwright's `e2e/test-results/`, which it empties when a run starts).
Read the counts and failures **from the file**:

```bash
mkdir -p test-results
npm test > test-results/unit.log 2>&1; echo "exit=$?"
```

**Never filter a run itself through `grep` or `tail`.** Test runners print the
count (`1 failed`) and the names of what failed on separate lines, so a pattern
that keeps one drops the other. That is how an E2E failure once went
unidentified, the suite was run twice more to find it, and the second run
overwrote the only record. Each suite runs **once**; a failure is named from
that run.

## Scope

This repository only. A change that also touched tag2now-BE is tested by that
repository's own `test` skill, in its own checkout.

**E2E (step 5) runs whenever code changed** — anything under `src/` or `e2e/`,
a stylesheet, a config. It is the only suite that exercises routing, the tab
strip and the modals as a browser sees them.

**A data- or docs-only change does not run this skill.** A manifest field, a
patch-notes entry, a markdown file: run the one check that reads it — a JSON
parse, `npx vitest run src/config/patchNotes.test.ts` for the line budget — or
nothing, when no test reads it. A `v*` tag runs the whole suite in the deploy
workflow before anything ships, so a local full run there buys only minutes.

## Steps

### 1. Import boundaries and project policy tests

```bash
npm run test:architecture > test-results/architecture-tests.log 2>&1; echo "exit=$?"
npm run lint:architecture > test-results/architecture.log 2>&1; echo "exit=$?"
```

The first command uses Node's test runner with dependency-cruiser's public API
and CLI against temporary TypeScript projects; report its count separately from
Vitest. It checks project policy, including the real transport/session exception.
The second invokes dependency-cruiser's native CLI with `.dependency-cruiser.mjs`
and reports forbidden/unresolved references and unused transport integration.
These commands also run in CI. They enforce dependencies, not component reuse.

### 2. Unit and component tests

```bash
npm test > test-results/unit.log 2>&1; echo "exit=$?"
```

`src/styles/tokens.test.ts` generates two cases for every `.css` file under
`src/`, so deleting a sheet drops the total by two without anything regressing.
Before calling a drop a regression, compare per-file counts with
`--reporter=json`.

### 3. Typecheck — both projects

```bash
npm run typecheck > test-results/typecheck.log 2>&1; echo "exit=$?"
npm run typecheck:e2e > test-results/typecheck-e2e.log 2>&1; echo "exit=$?"
```

Both run in CI. The root `tsconfig.json` includes `src` only, so the separate
E2E TypeScript project must also be checked.

### 4. Stylesheet lint

```bash
npm run lint:css > test-results/lint-css.log 2>&1; echo "exit=$?"
```

Also in CI. It enforces the token contract — no raw hex or `rgb()` in a
colour, no `font-size` or `font-weight` outside its `var(--…)` scale. With
stylelint missing from `node_modules` the script dies with
"'stylelint' is not recognized" instead of reporting, which reads like a broken
script rather than a skipped check. `npm install` fixes it; a check that did not
actually run is not a pass.

### 5. E2E

```bash
npx playwright test > test-results/e2e.log 2>&1; echo "exit=$?"
```

The same command CI runs: `e2e/specs` plus `e2e/visual/tokens.spec.ts`, which
compares computed colours rather than baseline images and so runs anywhere.
Playwright starts the dev server itself and reuses one already on :5173. It
intercepts every backend call, so it needs no running backend.

On a non-zero exit, the summary at the end of `test-results/e2e.log` lists each
failed test as `[project] › e2e/…/x.spec.ts:LINE:COL › title`, and
`e2e/test-results/.last-run.json` keeps the same list until the next run. Report
those names. No retries are configured locally, so a spec occasionally flakes;
confirm a suspected flake with

```bash
npx playwright test --last-failed > test-results/e2e-last-failed.log 2>&1; echo "exit=$?"
```

which re-runs only what failed. **Never re-run the whole suite to learn what
failed.** A failure that passes on `--last-failed` is still reported, by name,
as a flake.

## After the run

**A red suite blocks the commit.** This holds even when the failures look
unrelated to your change: a failure you did not cause is still a failure the
user needs to know about before anything lands. Report it and stop, rather than
committing "since it was already broken".

Never commit unless the user explicitly asks — passing tests mean the change is
*ready*, not that it should land.
