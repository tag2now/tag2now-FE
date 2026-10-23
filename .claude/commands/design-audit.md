# Design System Audit

Analyze the tag2now-FE codebase for design consistency issues across all components.

## Instructions

Paths below are relative to the FE repository root. Read the
[working agreement](../../AGENTS.md), [reuse search guide](../../docs/reuse.md)
and [styling guide](../../docs/styling.md) first.

Use `rg --files src -g '*.tsx' -g '*.ts' -g '*.css'` to discover App, shared
components and every feature folder. Theme tokens live in `src/styles/tokens.css`,
the JS palette in `src/shared/palette.ts`, and stylesheet order in `src/index.css`.
Inspect feature sheets plus `src/styles/` and `src/shared/styles/`.

For each component, check:

1. **Spacing consistency** — Use tokens and Tailwind's scale where they express the design. Check similar elements for inconsistent spacing. The styling guide permits feature-sheet values for rules outside that scale; do not treat every pixel value as a violation.
2. **Color usage** — Use `src/styles/tokens.css` for CSS tokens and the existing JS palette/chart theme for programmatic colors. Flag new independent hex/rgb values outside those canonical definitions.
3. **Typography** — Is font sizing consistent across similar elements (e.g., all table headers use same size)? Are `font-display` and `font-weight` used consistently?
4. **Component structure and reuse** — Discover equivalent implementations in current source and inspect their public APIs and real consumers. Search controls, ranking rows, character selectors, dialogs and status helpers by behavior before suggesting another implementation. Check whether status helpers add a panel wrapper and whether they support skeletons. Reusing a CSS class alone is not React-component reuse.
5. **Responsive patterns** — Check desktop, phone and widths around affected boundaries. The code currently mixes 760/761px, Tailwind 48rem and feature-specific container thresholds; use the styling/migration guides to distinguish pending migration from purposeful differences. Do not impose `sm:` on every layout.

## Output Format

Produce a structured report grouped by category:

```
### [Category: Spacing | Color | Typography | Structure | Responsive]

| Severity | File:Line | Current | Suggested Fix |
|----------|-----------|---------|---------------|
| high/med/low | path:line | what exists | what it should be |
```

Prioritize high-severity items (visible inconsistencies) over low-severity (code style preferences).

Audit only unless implementation is separately requested and approved. For each
suggestion, identify the existing reusable implementation or explain why none
fits, and name the affected consumers and verification needed.
