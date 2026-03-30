# Design Enhancement Review

Run a comprehensive design review combining consistency and accessibility checks, then suggest concrete improvements.

## Instructions

1. **Design consistency analysis** — Scan all components in `src/components/` and `src/components/community/` for spacing, color, typography, structural, and responsive patterns. Cross-reference against the theme tokens defined in `src/index.css`.

2. **Accessibility analysis** — Check all interactive elements for ARIA labels, keyboard support, semantic HTML, color contrast, and screen reader compatibility.

3. **Cross-reference with E2E coverage** — Review the Playwright E2E test files in `e2e/specs/` and `e2e/visual/` to identify which UI states and components have test coverage and which don't.

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

Keep suggestions practical for this project's size. Do not suggest adding new dependencies unless strictly necessary.
