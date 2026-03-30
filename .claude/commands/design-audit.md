# Design System Audit

Analyze the tag2now-FE codebase for design consistency issues across all components.

## Instructions

Scan all component files in `src/components/` and `src/components/community/`, plus `src/index.css` for theme token definitions.

For each component, check:

1. **Spacing consistency** — Are padding/margin values using Tailwind's standard scale? Flag any raw pixel values or inconsistent spacing between similar elements.
2. **Color usage** — Are all colors using CSS custom properties or Tailwind theme tokens defined in `src/index.css`? Flag hardcoded hex/rgb values.
3. **Typography** — Is font sizing consistent across similar elements (e.g., all table headers use same size)? Are `font-display` and `font-weight` used consistently?
4. **Component structure** — Do all panel components use the `.panel` class? Do all error states use `.state-msg.error`? Do all loading states use `.state-msg`?
5. **Responsive patterns** — Do all components handle mobile/desktop via Tailwind breakpoints consistently (sm: prefix)?

## Output Format

Produce a structured report grouped by category:

```
### [Category: Spacing | Color | Typography | Structure | Responsive]

| Severity | File:Line | Current | Suggested Fix |
|----------|-----------|---------|---------------|
| high/med/low | path:line | what exists | what it should be |
```

Prioritize high-severity items (visible inconsistencies) over low-severity (code style preferences).
