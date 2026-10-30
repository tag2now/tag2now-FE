# Styling and shared visual behavior

[Documentation index](../CLAUDE.md)

Paths and commands in prose are relative to the FE repository root unless linked otherwise.

Tailwind CSS 4 with the CSS-first config — there is no `tailwind.config.js`. Design tokens are declared in an `@theme` block in `src/styles/tokens.css` and become utilities automatically (`--color-primary` → `bg-primary`, `text-primary`, `border-primary`).

**Where a rule lives follows the code it styles**, like the TS around it:

| Folder | Holds |
|--------|-------|
| `src/styles/` | the global sheets — tokens, base, primitives, the app shell, surfaces, dialogs shared by several features, and the phone overrides that belong to no one feature |
| `src/shared/styles/` | the shared components' — `ranking.css` (RankList), `history.css` (PlayerHistoryPanel), `leaderboard.css`, `saves.css` (SaveCharTable) |
| `src/<feature>/<feature>.css` | one feature's own rules, its phone overrides in an `@media` block at the end of the same file |

A rule goes to a feature's file only when that feature alone uses its classes;
anything two features share stays global. Every sheet is still imported from
`src/index.css` and never from a component, because **the order of that list
is the cascade**: the rules share one layer, so moving an import changes which
rule wins.

**A board's controls go in its title bar.** A switch or option for a panel
sits in that panel's `.section-toolbar`, beside its refresh button. Select an
existing React control using the [reuse search guide](reuse.md) first;
sharing `.segmented-control` or `.toggle-group` CSS alone does not satisfy the
reuse review. Tabs, single-value choices and on/off buttons retain their own
semantics. Avoid a new row or bespoke styles above the `.panel`. The bar renders in loading and error states too, at
the same position in the tree, or the control vanishes with the content and
loses focus (`shared/Leaderboard.tsx` is the example). Check a layout change in
desktop and phone screenshots before calling it done.

**A utility in the markup always beats a sheet.** Every sheet but `tokens.css`
and `base.css` is imported `layer(components.app)`, under Tailwind's
`utilities` layer, so `className="panel-meta mb-1"` gets its `mb-1` whatever
`.panel-meta` sets. Inside `components.app` the rules placed directly in it
outrank `primitives.css`'s `@layer primitives` block regardless of
specificity, which is what lets a feature override a shared control.

The flip side: a sheet can no longer override a utility, a phone `@media`
block included. A value that changes with the viewport belongs wholly to one
side — both widths in the sheet (the match tables' `<col>`s), or both as
utilities — never a utility the sheet narrows on a phone. Before this, sheets
were unlayered and won; the utilities they silently beat were removed when the
layer moved.

**Moving a sheet into utilities.** A rule moves onto the element when tokens
and Tailwind's scale can say it; one that needs a value outside them —
`min()`/`max()`, a shadow mixed off a token, a line height between the named
steps — stays in the feature's sheet, where `lint:css` still checks it.
`auth/auth.css` is the worked example, and [tailwind-migration.md](tailwind-migration.md) tracks
which sheets are done and how a unit goes. Write it mobile-first, as Tailwind
assumes: the bare class is the phone, `md:` (Tailwind's default 48rem, 768px)
the desktop, and a sheet rule left beside such utilities uses
`@media (width < 48rem)` so both switch together. The sheets not yet moved
still break at `max-width: 760px`, so the two boundaries differ by eight
pixels until they are.

Two Tailwind behaviours differ from the sheets they replace. `hover:` applies
only where the device can hover (`@media (hover: hover)`, per Tailwind v4), so
a tap on a phone no longer leaves a hover state behind. `transition-colors`
uses Tailwind's easing, `cubic-bezier(0.4, 0, 0.2, 1)`, rather than `ease`.

`.app-layout` caps the page at `min(var(--content-max), 100% - 32px)` — sidebar,
main column and, from 1350px, the chat column — so it sets the width of
**every** tab. A change here lands on
every screen, not just the tab that prompted it.

`--content-max` (1366px) is shared with `.app-header`'s horizontal padding so
the header's content edges line up with the layout's. That padding is computed
from `100%`, not `100vw`: `100vw` counts the scrollbar and put the header ~7px
off the content below it.

Use tokens rather than raw hex or arbitrary values. **Pretendard** backs both
`--font-sans` and `--font-display`, imported as an npm package in `main.tsx`
(`pretendard/…/pretendardvariable-dynamic-subset.css`) — not from Google Fonts.

`--color-txt-faint` is the floor for tertiary text: it is the dimmest grey that
still clears 4.5:1 on every surface in play, the `#1b1b1f` input fill included.
Reach for it rather than inventing another hex — several of the greys it
replaced sat at 4.0–4.3, and the 7–10px sizes this text uses get no large-text
exemption. The one deliberate holdout is `.input-base:disabled`, where WCAG
exempts inactive controls anyway.

Rank/tier and medal colours live in `shared/tierColors.ts` and `shared/medalColors.ts`; character art paths in `shared/characterImage.ts`.

Charts use `shared/components/chartTheme.ts`, backed by `shared/palette.ts`, for
their JS color and tooltip props. Keep that palette aligned with the relevant
`@theme` tokens rather than introducing a second chart-specific color table.

**The daily chart is one panel on two pages.** The stats tab and the home
screen both render `shared/components/DailyPlayersPanel`, full width, and it
takes the rows and nothing else: no height, heading level or class. That is
deliberate. When each page passed its own, the two drew the same chart at
different sizes, and changes were checked on one page and shipped to both. The
stats tab stacks the hourly chart above it rather than beside it, so the panel
keeps the same size there. A change to it is still a change to **both pages**;
check each of them, at desktop and phone width.

Its two plots — 접속자 수 and 최대 동시 접속 — sit side by side from 600px of
chart width and stack below that. `DailyChart` measures itself with
`shared/hooks/useMinWidth` rather than leaving this to a container query,
because the arrangement changes Recharts props: side by side, each plot is
200px and draws its own dates; stacked, the pair shares 280px and only the
bottom one does.

Not every rank the API reports has artwork under `public/ranks/` — `Tekken Lord`
and `Initiate` among them. `RankImage` renders a named, tier-colored plate on load
error rather than the browser's broken-image glyph. `plateClassName` can size the
fallback separately from the image. It keys that failure to the rank
**name**: React reuses the element across list rows, so a bare boolean would
blank the next rank that does have art.

## Brand assets

`public/favicon.svg` and `public/og-image.png` both carry the black-and-red
palette; keep them in step with `--color-primary` when it moves.

The 1200×630 share card is generated, not hand-drawn — edit
`scripts/og-image.html` and re-render:

```bash
node scripts/generate-og-image.mjs
```

It renders through the Chromium that Playwright already installs, so it needs
no extra dependency. Include the regenerated PNG in the change; Git commits still
require the user's explicit request. The share metadata uses this raster asset.
