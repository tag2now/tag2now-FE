---
name: test
description: Run the full tag2now test suite before offering a commit in tag2now-FE — this repository's checks in CI's order, plus tag2now-BE's when it changed — and report every step with its counts and the name of every failure. Use whenever a change here is ready to commit, or when asked to run the tests, the E2E suite, or "everything".
---

# test — the whole suite, from the frontend side

Run this before offering a commit.

**This file is one of a pair.** `tag2now-BE/.claude/skills/test/SKILL.md` is the
same run written from the backend side. Both describe *all* the steps on purpose:
neither suite here can see a backend rename — unit tests mock the API and E2E
intercepts it — so the check that catches one lives in the other repository. A
run that stopped at this repository's boundary would be the same partial run
this file exists to prevent. **Edit a shared step in both files, or they drift.**

Later steps depend on earlier ones — the contract check below needs the
backend's schema dumped first. Do not reorder to save time.

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

| Changed | Run |
|---------|-----|
| Only `tag2now-FE/` | Steps 6–10 |
| `tag2now-BE/` too | All steps |

**E2E (step 10) always runs when this repository changed.** It is the only suite
that exercises routing, the tab strip and the modals as a browser sees them.

If `../tag2now-BE` is not checked out beside this repository, run steps 6–10
using the committed `src/config/openapi.json` as-is and **say plainly that the
backend steps were not run** — do not report a clean run.

## Steps

### 1–5. The backend suites

Run these from `../tag2now-BE` when it changed — the same five steps its own
`test` skill describes. They need PostgreSQL and Redis:

```bash
cd ../tag2now-BE && docker compose -f compose.test.yml up -d --wait
cd ../tag2now-BE && .venv/Scripts/python.exe -m pytest tests/unit/ -v
cd ../tag2now-BE && DATABASE_URL=postgresql+psycopg://tag2now:tag2now@127.0.0.1:5433/tag2now .venv/Scripts/python.exe -m alembic upgrade head
cd ../tag2now-BE && .venv/Scripts/python.exe -m pytest tests/integration/ -v -m "not rpcn"
cd ../tag2now-BE && .venv/Scripts/python.exe scripts/dump_openapi.py
```

`alembic upgrade head` before the integration tests is not optional, and its
`DATABASE_URL` is the point: the test stack is its own compose project on 5433,
and without the variable alembic migrates the *dev* database on 5432 instead. A
test database left on an older revision fails with
`column "..." of relation "..." does not exist` — dozens of failures that look
like a broken change and are not. Those steps write their logs to the backend's
own `test-results/`, as its skill describes.

### 6. Check the vendored contract copy

```bash
diff -u --strip-trailing-cr src/config/openapi.json ../tag2now-BE/openapi.json
```

`--strip-trailing-cr` is required on Windows: git's `core.autocrlf` checks one
copy out with CRLF endings, and a plain `diff -u` then reports every one of its
3,700 lines as changed — a check that always fails tells you nothing.

CI compares against the file published on tag2now-BE's `master`; locally,
compare against the sibling working tree, which is what is about to be
committed. A difference means `src/config/openapi.json` needs the new schema
copied over and `src/config/contract.test.ts` updated to match.

Without a sibling checkout, fall back to the published copy:

```bash
curl -sSfo test-results/openapi.json https://raw.githubusercontent.com/tag2now/tag2now-BE/master/openapi.json
diff -u --strip-trailing-cr src/config/openapi.json test-results/openapi.json
```

**This is the only check that sees the seam between the two repositories.** Unit
tests replace the API module with a mock and `mockAllApis` answers with whatever
this frontend already believed, so both stay green through a backend rename that
breaks production. Run it even when the change looks unrelated to the API: it
takes a second, and "looked unrelated" is how it gets skipped.

### 7. Unit and component tests

```bash
npm test > test-results/unit.log 2>&1; echo "exit=$?"
```

`src/styles/tokens.test.ts` generates two cases for every `.css` file under
`src/`, so deleting a sheet drops the total by two without anything regressing.
Before calling a drop a regression, compare per-file counts with
`--reporter=json`.

### 8. Typecheck — both projects

```bash
npm run typecheck > test-results/typecheck.log 2>&1; echo "exit=$?"
npx tsc --noEmit -p e2e/tsconfig.json > test-results/typecheck-e2e.log 2>&1; echo "exit=$?"
```

The second is not in CI: the root `tsconfig.json` includes `src` only, so a type
error in `e2e/` passes CI and every other check here.

### 9. Stylesheet lint

```bash
npm run lint:css > test-results/lint-css.log 2>&1; echo "exit=$?"
```

Not in CI either. It enforces the token contract — no raw hex or `rgb()` in a
colour, no `font-size` or `font-weight` outside its `var(--…)` scale. It fails
**open**: with stylelint missing from `node_modules` the script dies with
"'stylelint' is not recognized" instead of reporting, which reads like a broken
script rather than a skipped check. `npm install` fixes it; a check that did not
actually run is not a pass.

### 10. E2E

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

**A change that spans both repositories needs two commits**, one per repository.
Never commit unless the user explicitly asks — passing tests mean the change is
*ready*, not that it should land.
