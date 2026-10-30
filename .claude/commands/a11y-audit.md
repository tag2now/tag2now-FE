# Accessibility Audit

Analyze the tag2now-FE codebase for accessibility issues following WCAG 2.1 AA guidelines.

## Instructions

Paths below are relative to the FE repository root. Read the
[working agreement](../../AGENTS.md), [reuse search guide](../../docs/reuse.md)
and relevant [architecture](../../docs/architecture.md) sections first.

Discover current files with `rg --files src -g '*.tsx' -g '*.ts' -g '*.css'`.
Inspect `src/App.tsx`, `src/shared/components/` and every feature folder,
including its `component/` folder where present. Exclude tests from production
findings, but inspect them to understand expected interaction and coverage.

Check for:

1. **ARIA labels** — All interactive elements (buttons, inputs, links) must have accessible names via `aria-label`, `aria-labelledby`, or visible text content. Flag unlabeled interactive elements.
2. **Color contrast** — Review utility classes and rendered colors against `src/styles/tokens.css` and the JS palette in `src/shared/palette.ts`. `src/index.css` owns stylesheet imports. Report measured contrast where possible and distinguish unverified combinations.
3. **Keyboard navigation** — Check that all clickable elements use semantic `<button>` or `<a>` tags, not `<div onClick>` or `<span onClick>`. Check for proper `tabIndex` usage.
4. **Semantic HTML** — Prefer native elements and verify required roles and associations. A grid may deliberately implement table/row/columnheader/cell roles; inspect the complete structure rather than flagging every non-native table. Distinguish tabs, radio choices and on/off buttons. Check the heading hierarchy.
5. **Dynamic content** — Loading states, error messages, and content updates should be announced to screen readers. Check for `aria-live` regions where content changes.
6. **Focus management** — When switching tabs or views, is focus managed appropriately? Are focus indicators visible?
7. **Image alt text** — Informative images need meaningful alternatives. Use empty alt text for decorative images when adjacent text already conveys the same information; do not announce filenames.
8. **Shared behavior** — Search current source for equivalent dialog, popup and selection behavior before proposing another implementation. Inspect candidates' public APIs and real consumers; preserve role, focus and keyboard contracts. A reuse gap is not proof that two different controls should be merged.

## Output Format

Group findings by severity:

Audit only unless implementation is separately requested and approved. Include
existing shared code that can address each finding and the behavioral test or
manual check that would verify it.

### Critical (blocks users)
- File:line — issue description — remediation

### Important (degrades experience)
- File:line — issue description — remediation

### Minor (best practice)
- File:line — issue description — remediation
