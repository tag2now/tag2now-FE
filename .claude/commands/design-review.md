# Design Enhancement Review

Run a comprehensive design review combining consistency and accessibility checks, then suggest concrete improvements.

## Instructions

Start with the [working agreement](../../AGENTS.md),
[reuse search guide](../../docs/reuse.md), [styling guide](../../docs/styling.md)
and [testing guide](../../docs/testing.md). Paths below are relative to the FE
repository root. Audit only unless implementation is separately requested and approved.

1. **Design consistency analysis** — Discover current code with `rg --files src -g '*.tsx' -g '*.ts' -g '*.css'`. Inspect App, shared components and every feature folder. Cross-reference tokens in `src/styles/tokens.css`, JS colors in `src/shared/palette.ts` and import order in `src/index.css`.

2. **Accessibility analysis** — Check all interactive elements for ARIA labels, keyboard support, semantic HTML, color contrast, and screen reader compatibility.

3. **Cross-reference with coverage and reuse** — Review colocated component tests and Playwright files in `e2e/specs/` and `e2e/visual/`. The visual token spec compares computed colors; there is no tracked screenshot-baseline suite. Identify a suitable existing component/hook and inspect its API and a real call site before proposing an abstraction.

4. **Produce prioritized suggestions**:

### P0 — Accessibility violations that block users
Concrete fixes with file, line, and exact code change needed.

### P1 — Visual inconsistencies visible to users
Design token misuse, spacing irregularities, responsive breakpoints missing.

### P2 — Code quality improvements
Component patterns that should be standardized, shared utilities that could reduce duplication.

For each suggestion, include:
- The specific file(s) and line(s) to change
- The exact code change needed (before → after)
- Why it matters (user impact)
- Which E2E or visual test would catch regression if the fix is reverted
- Which existing component or hook to reuse/extend, its constraints, and other consumers affected; explain any genuinely different behavior requiring a local implementation

Keep suggestions practical for this project's size. Do not suggest adding new dependencies unless strictly necessary.
