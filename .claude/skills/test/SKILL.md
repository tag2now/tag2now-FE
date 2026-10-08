---
description: Run the full tag2now test suite in CI's order — this repository's four steps, plus tag2now-BE's — and report what passed.
---

# /test — the whole suite, from the frontend side

Run this before offering a commit.

**This file is one of a pair.** `tag2now-BE/.claude/commands/test.md` is the same
run written from the backend side. Both describe *all* the steps on purpose:
neither suite here can see a backend rename — unit tests mock the API and E2E
intercepts it — so the check that catches one lives in the other repository. A
command that stopped at this repository's boundary would be the same partial run
this file exists to prevent. **Edit a shared step in both files, or they drift.**

Later steps depend on earlier ones — the contract check below needs the
backend's schema dumped first. Do not reorder to save time.

**Report honestly.** Give pass/fail counts for every step you ran, name any step
you skipped and why, and paste failure output for anything red. A step that
errored for an environment reason is not a pass.

## Scope

| Changed | Run |
|---------|-----|
| Only `tag2now-FE/` | Steps 6–9 |
| `tag2now-BE/` too | All steps |

**E2E (step 9) always runs when this repository changed.** It is the only suite
that exercises routing, the tab strip and the modals as a browser sees them.

If `../tag2now-BE` is not checked out beside this repository, run steps 6–9
using the committed `src/config/openapi.json` as-is and **say plainly that the
backend steps were not run** — do not report a clean run.

## Steps

### 1–5. The backend suites

Run these from `../tag2now-BE` when it changed — the same five steps its own
`/test` describes. They need PostgreSQL and Redis:

```bash
cd ../tag2now-BE && docker compose -f compose.test.yml up -d --wait
cd ../tag2now-BE && .venv/Scripts/python.exe -m pytest tests/unit/ -v
cd ../tag2now-BE && .venv/Scripts/python.exe -m alembic upgrade head
cd ../tag2now-BE && .venv/Scripts/python.exe -m pytest tests/integration/ -v -m "not rpcn"
cd ../tag2now-BE && .venv/Scripts/python.exe scripts/dump_openapi.py
```

`alembic upgrade head` before the integration tests is not optional: the
container's volume persists across branches, and a database on an older revision
fails with `column "..." of relation "..." does not exist` — dozens of failures
that look like a broken change and are not.

### 6. Check the vendored contract copy

```bash
diff -u src/config/openapi.json ../tag2now-BE/openapi.json
```

CI compares against the file published on tag2now-BE's `master`; locally,
compare against the sibling working tree, which is what is about to be
committed. A difference means `src/config/openapi.json` needs the new schema
copied over and `src/config/contract.test.ts` updated to match.

Without a sibling checkout, fall back to the published copy:

```bash
curl -sSfo /tmp/openapi.json https://raw.githubusercontent.com/tag2now/tag2now-BE/master/openapi.json
diff -u src/config/openapi.json /tmp/openapi.json
```

**This is the only check that sees the seam between the two repositories.** Unit
tests replace the API module with a mock and `mockAllApis` answers with whatever
this frontend already believed, so both stay green through a backend rename that
breaks production.

### 7. Unit and component tests

```bash
npm test
```

### 8. Typecheck

```bash
npm run typecheck
```

### 9. E2E

```bash
npx playwright test e2e/specs
```

**`e2e/specs`, never a bare `npx playwright test`.** The visual suite under
`e2e/visual` has no committed baseline — `.gitignore` excludes the snapshot
directory outright — so a bare run fails with "a snapshot doesn't exist". CI
excludes it for the same reason.

Playwright starts the dev server itself and reuses one already on :5173. It
intercepts every backend call, so it needs no running backend.

A single spec occasionally flakes locally (no retries are configured). Re-run
that one spec before reporting it as a failure.

To check a visual change deliberately, run `npx playwright test e2e/visual`
separately and read it as a local-only comparison against whatever this machine
last produced — a stale baseline fails on unrelated changes, and deleting the
offending `*-win32.png` lets the next run recreate it.

## After the run

**A red suite blocks the commit.** This holds even when the failures look
unrelated to your change: a failure you did not cause is still a failure the
user needs to know about before anything lands. Report it and stop, rather than
committing "since it was already broken".

**A change that spans both repositories needs two commits**, one per repository.
Never commit unless the user explicitly asks — passing tests mean the change is
*ready*, not that it should land.
