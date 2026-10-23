# Tailwind migration — status and how to continue

Moving single-use styles out of the stylesheets and onto the elements, so a
component's look is read and edited where its markup is. Started 2026-10-08.
This file records migration decisions and remaining candidates. Read the
[styling guide](styling.md) and [reuse search guide](reuse.md) before the
next unit; the [working agreement](../AGENTS.md) governs planning and approval.
Status notes were reviewed on 2026-10-23. Historical line counts below remain
explicitly tied to their original revision, not the current checkout.

## What was decided, and on what grounds

| Decision | Grounds |
|----------|---------|
| Every sheet but `tokens.css`/`base.css` is imported `layer(components.app)`, under Tailwind's `utilities` layer, so a utility in the markup always beats a sheet | Before this, unlayered sheets silently beat utilities written beside them |
| A rule moves onto the element when tokens and Tailwind's scale can say it; one needing a value outside them (`min()`/`max()`, a shadow mixed off a token, an odd line height, a breakpoint that is not a token) stays in the feature's sheet, where `lint:css` still checks it | Keeps the styling guide's token policy and the lint's reach |
| A class shared by several elements or components stays a sheet class | Project rule: anything two features share stays global |
| No `cn()`/tailwind-merge. A component exposes a prop and picks one class (`RankSummary`'s `wrap`) | [Tailwind: never add two conflicting classes; expose props](https://tailwindcss.com/docs/styling-with-utility-classes). [tailwind-merge calls itself an escape hatch](https://github.com/dcastil/tailwind-merge/blob/tailwind-merge@3.7.0/packages/tailwind-merge/docs/when-and-how-to-use-it.md). `cn` is a shadcn convention, not a Tailwind standard |
| Mobile-first: the bare class is the phone, `md:` (Tailwind's default 48rem) the desktop; a sheet rule left beside such utilities uses `@media (width < 48rem)` | [Tailwind responsive design](https://tailwindcss.com/docs/responsive-design). Breakpoints keep one unit, so `md` stays the default rather than 761px |
| Accepted differences when a rule moves: `transition-colors` uses Tailwind's easing; `hover:` applies only on hover-capable devices | [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) |

## Done

| Commit | Unit |
|--------|------|
| `27e1528` | Step 0: the layer change, and the utilities the sheets used to beat removed; match tables' `<col>` widths moved into `match.css` |
| `2027507` | `stat.css` folded into utilities and deleted |
| `811599f` | `RankSummary` gets a `wrap` prop (the earlier `cn()` commits `e6e37df`/`a79ac4b` are superseded by this) |
| `c420007` | `auth.css`: ten elements onto utilities; the rest stays, with the login input/button overrides moved in from `boards.css` |
| Current source | Rank-plate sizing is implemented through [RankImage's](../src/shared/components/RankImage.tsx) `plateClassName`; it is not pending work |

`saves.css` was looked at and left as is: its table classes are shared by three
tables, and the rest needs values outside the token scale.

## How a unit is done

1. Read the sheet, find current class users with `rg`, and inspect existing shared
   components before moving styles onto copied markup. A single-use class is a
   candidate; a class serving a shared responsibility stays.
2. Classify rules by the criterion above and follow the approved scope. Migration
   order requires a plan; the table below does not authorize the next code change.
3. Follow the [test workflow](../.claude/skills/test/SKILL.md) when stylesheet/code
   changes are final. Capture whole outputs under `test-results/` and inspect
   affected shared consumers at desktop and phone sizes.
4. Keep a unit reviewable and update its status here. Deleting a sheet drops
   `tokens.test.ts` by two cases per file; that is not a regression. Commit only
   when the user explicitly requests it.

## Remaining sheets

Smallest first, as the order went so far. Line counts as of `c420007`.

| Sheet | Lines | Notes |
|-------|-------|-------|
| `admin/admin.css` | 66 | Candidate, not an approved next step. Used by admin screens; recheck shared class users before moving rules |
| `reservation/reservation.css` | 79 | |
| `shared/styles/leaderboard.css` | 91 | Shared component |
| `match/match.css` | 99 | Phone block at 760px; column widths must stay in the sheet with it |
| `shared/styles/history.css` | 114 | Shared component (profile panel) |
| `chat/chat.css` | 115 | Docking breakpoint is in JS (`DOCKED_QUERY`) |
| `overview/overview.css` | 146 | |
| `community/community.css` | 151 | |
| `shared/styles/ranking.css` | 168 | Container query and `:nth-child` placement — most stays |
| `styles/*` | — | Global sheets: shell, surfaces, primitives, responsive. Layout skeleton; expected to stay largely as is |

## Open items

- **Unused CSS candidates from the earlier migration** (recheck current users before removal): `filter-bar`,
  `filter-label`, `char-rank`, `profile-summary`, `profile-edit`,
  `profile-chars`, `sidebar-status`, `detail-tabs`. (`rank-plate` looks unused
  to a plain grep but is built in a template string in `RankImage`.)
- **Two breakpoints**: sheets not yet moved still break at `max-width: 760px`,
  moved code at 48rem (768px). Converge as units land.
- **`sm:` at 640px** in `Reservation.tsx`, `ReservationForm.tsx` and
  `CommentTree.tsx` disagrees with both; check those layouts at 641–760px
  before aligning them to `md:`.
- **Visual candidates carried from the earlier migration**: LoginDialog's
  password input has no extra right padding beside its 48px reveal button, and
  ReservationForm's "NEW MATCH REQUEST" uses `panel-meta`. Reproduce the affected
  states in the browser before proposing a fix; current rendered overlap/color
  has not been revalidated by this documentation-only change.

## Environment notes

- The dev server on :5173 is usually the user's; do not stop it. Without
  `BE=local` it proxies to production.
