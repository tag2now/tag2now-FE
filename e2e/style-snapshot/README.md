# style-snapshot

Records the computed style of every element on a fixed list of screen states,
and compares two recordings. Use it around any change to a stylesheet, its
import order, or the classes on an element: it names each property that moved,
where E2E only checks behaviour and passes through a restyle.

Not part of the test suite. `capture.ts` does not match Playwright's
`*.spec.ts` pattern, so CI's `npx playwright test` never runs it.

## Files

| File | Does |
|------|------|
| `capture.ts` | Drives each state with the E2E API mocks and writes `<OUT>/<viewport>/<state>.json.gz` |
| `diff.mjs` | Lists every element whose style differs between two recordings |
| `coverage.mjs` | Lists sheet classes no recorded state drew — rules no comparison checked |
| `playwright.config.ts` | Three viewports: `wide` 1440×900 (chat docked), `desktop` 1280×720, `mobile` Pixel 5 |

## Comparing two builds

Record each side as a production build, not the dev server — dev mode injects
CSS differently. To compare commits, check each out in a worktree:

```bash
git worktree add --detach ../wt-before <commit>
```

Link its `node_modules` to this repository's (PowerShell:
`New-Item -ItemType Junction -Path ..\wt-before\node_modules -Target .\node_modules`),
then build and serve it with the worktree's own vite — never through `npx`
(see the FE CLAUDE.md on worktrees):

```bash
cd ../wt-before && node node_modules/vite/bin/vite.js build
cd ../wt-before && node node_modules/vite/bin/vite.js preview --port 4801 --strictPort --host 127.0.0.1
```

The working tree builds without touching `dist/` by passing
`--outDir <elsewhere>` to both `build` and `preview`.

Record the base twice, so what differs run to run is not mistaken for a change,
then the other side once:

```bash
BASE_URL=http://127.0.0.1:4801 OUT=test-results/ss/before npx playwright test -c e2e/style-snapshot/playwright.config.ts > test-results/ss-before.log 2>&1
BASE_URL=http://127.0.0.1:4801 OUT=test-results/ss/before-again npx playwright test -c e2e/style-snapshot/playwright.config.ts > test-results/ss-before-again.log 2>&1
BASE_URL=http://127.0.0.1:4802 OUT=test-results/ss/after npx playwright test -c e2e/style-snapshot/playwright.config.ts > test-results/ss-after.log 2>&1
node e2e/style-snapshot/diff.mjs test-results/ss/before test-results/ss/after test-results/ss/before-again
node e2e/style-snapshot/coverage.mjs test-results/ss/after
```

Narrow a run to some states with `-g "<name>"`. A state one side did not reach
is reported as not compared rather than failing the diff.

## Reading the output

```
## mobile/match-player  (13 elements, 184 total)
  body:1>div:0>…>col:0  [w-52]
    width: 84px → 208px
```

The key is the element's tag and position path; the bracket is its class list,
which is how a difference is traced back to markup. Colours are painted to a
canvas first, so the same colour written as `color(srgb …)` by a sheet and
`oklab(…)` by a utility compares equal. Custom properties are skipped: one that
matters shows up through the property that reads it.

Two differences are expected whenever a sheet rule moves onto a utility, and
are not regressions: `transition-timing-function` goes from `ease` to
Tailwind's curve, and `hover:` no longer applies on the `mobile` project
(Tailwind v4 wraps it in `@media (hover: hover)`).

## Adding a state

Every state needs a `ready` locator: what must be on screen once its steps ran.
Without one a click that missed records whatever screen it left — the admin
save page went unchecked for that reason, recorded as the empty lookup form.
Run `coverage.mjs` after adding states; a class it lists is either still
undrawn or no longer used.

The character grids start open on a screen at least 761×800
(`useCharacterPickerDefault`), so `wide` begins with them open; open one
through `openCharacterPicker`, which clicks only when it is closed.

## Traps

- **Give any Playwright config an `outputDir`.** Without one Playwright uses
  `test-results/` at the repository root and empties it when a run starts —
  the same directory the test skill writes its logs to.
- **Detach the `node_modules` junction before removing a worktree**
  (`(Get-Item ..\wt-before\node_modules).Delete()`), then
  `git worktree remove --force`. Removing it with the junction in place risks
  deleting through it into this repository's `node_modules`.
- **`--last-failed` reads the last run of that config.** Recording the other
  side straight after a failure overwrites the record; re-run a failure before
  starting the next recording, or by name with `-g`.
