---
name: test
description: Run tag2now-FE's whole test suite before offering a commit — this repository's checks in CI's order — and report every step with its counts and the name of every failure. Use whenever a change here is ready to commit, or when asked to run the tests, the E2E suite, or "everything".
---

# test — the whole frontend suite

Run this before offering a commit.

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

**E2E (step 4) always runs when this repository changed.** It is the only suite
that exercises routing, the tab strip and the modals as a browser sees them.

## Steps

### 1. Unit and component tests

```bash
npm test > test-results/unit.log 2>&1; echo "exit=$?"
```

`src/styles/tokens.test.ts` generates two cases for every `.css` file under
`src/`, so deleting a sheet drops the total by two without anything regressing.
Before calling a drop a regression, compare per-file counts with
`--reporter=json`.

### 2. Typecheck — both projects

```bash
npm run typecheck > test-results/typecheck.log 2>&1; echo "exit=$?"
npx tsc --noEmit -p e2e/tsconfig.json > test-results/typecheck-e2e.log 2>&1; echo "exit=$?"
```

The second is not in CI: the root `tsconfig.json` includes `src` only, so a type
error in `e2e/` passes CI and every other check here.

### 3. Stylesheet lint

```bash
npm run lint:css > test-results/lint-css.log 2>&1; echo "exit=$?"
```

Not in CI either. It enforces the token contract — no raw hex or `rgb()` in a
colour, no `font-size` or `font-weight` outside its `var(--…)` scale. It fails
**open**: with stylelint missing from `node_modules` the script dies with
"'stylelint' is not recognized" instead of reporting, which reads like a broken
script rather than a skipped check. `npm install` fixes it; a check that did not
actually run is not a pass.

### 4. E2E

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
