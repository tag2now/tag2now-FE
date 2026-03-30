# Accessibility Audit

Analyze the tag2now-FE codebase for accessibility issues following WCAG 2.1 AA guidelines.

## Instructions

Scan all component files in `src/components/` and `src/components/community/`.

Check for:

1. **ARIA labels** — All interactive elements (buttons, inputs, links) must have accessible names via `aria-label`, `aria-labelledby`, or visible text content. Flag unlabeled interactive elements.
2. **Color contrast** — Review Tailwind classes against the CSS custom properties in `src/index.css`. Flag text/background combinations that may fail WCAG AA (4.5:1 for normal text, 3:1 for large text).
3. **Keyboard navigation** — Check that all clickable elements use semantic `<button>` or `<a>` tags, not `<div onClick>` or `<span onClick>`. Check for proper `tabIndex` usage.
4. **Semantic HTML** — Tables should use `<thead>`, `<th>`, `<tbody>`. Lists should use `<ul>`/`<ol>`. Headings should follow hierarchy (no skipping levels).
5. **Dynamic content** — Loading states, error messages, and content updates should be announced to screen readers. Check for `aria-live` regions where content changes.
6. **Focus management** — When switching tabs or views, is focus managed appropriately? Are focus indicators visible?
7. **Image alt text** — All `<img>` tags should have meaningful alt text, not just the filename.

## Output Format

Group findings by severity:

### Critical (blocks users)
- File:line — issue description — remediation

### Important (degrades experience)
- File:line — issue description — remediation

### Minor (best practice)
- File:line — issue description — remediation
