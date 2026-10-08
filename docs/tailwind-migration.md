# Tailwind migration — status and how to continue

Moving single-use styles out of the stylesheets and onto the elements, so a
component's look is read and edited where its markup is. Started 2026-10-08.
This file is the hand-off: read it, then the Styling section of `CLAUDE.md`,
before the next unit.

## What was decided, and on what grounds

| Decision | Grounds |
|----------|---------|
| Every sheet but `tokens.css`/`base.css` is imported `layer(components.app)`, under Tailwind's `utilities` layer, so a utility in the markup always beats a sheet | Before this, unlayered sheets silently beat utilities written beside them |
| A rule moves onto the element when tokens and Tailwind's scale can say it; one needing a value outside them (`min()`/`max()`, a shadow mixed off a token, an odd line height, a breakpoint that is not a token) stays in the feature's sheet, where `lint:css` still checks it | Keeps CLAUDE.md's "tokens, not arbitrary values" and the lint's reach |
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
| *(next commits)* | Rank-plate regression from step 0 fixed (`RankImage` `plateClassName`); `e2e/style-snapshot/` added |

`saves.css` was looked at and left as is: its table classes are shared by three
tables, and the rest needs values outside the token scale.

Step 0 was re-verified after the fact by building the commit before it and the
commit itself in worktrees and comparing 59 states × 3 widths. One regression
came out — rank plates drawn by `RankSummary` shrank — and is fixed; nothing
else moved.

## How a unit is done

1. Read the sheet and list where each class is used (`git grep`). Count uses:
   a class used once is a candidate; a shared one stays.
2. Classify each rule by the criterion above. Expect roughly half to stay.
3. Make sure `e2e/style-snapshot` draws every class in the sheet
   (`coverage.mjs`); add states with a `ready` locator for any that are not.
4. Record the base build twice, edit, record again, and read
   `diff.mjs`. Every remaining difference is either fixed or named as one of
   the accepted ones above. See `e2e/style-snapshot/README.md`.
5. Run the test skill (`.claude/skills/test/SKILL.md`), one run per suite,
   output to `test-results/`.
6. One commit per unit. Deleting a sheet drops `tokens.test.ts` by two cases
   per file; that is not a regression.

## Remaining sheets

Smallest first, as the order went so far. Line counts as of `c420007`.

| Sheet | Lines | Notes |
|-------|-------|-------|
| `admin/admin.css` | 66 | **Next.** Used by `Admin.tsx` and `SaveAdmin.tsx`; several classes (`admin-notice` ×7, `save-section` ×5) are shared and stay |
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

- **Classes no state draws yet** (22): mostly admin error/warning states, the
  chat unread badge, history empty/loading states. Statically checked: none
  shares its element with a utility, so step 0 could not have moved them; a
  unit touching one should add its state first.
- **Unused CSS** (8, for a separate cleanup commit): `filter-bar`,
  `filter-label`, `char-rank`, `profile-summary`, `profile-edit`,
  `profile-chars`, `sidebar-status`, `detail-tabs`. (`rank-plate` looks unused
  to a plain grep but is built in a template string in `RankImage`.)
- **Two breakpoints**: sheets not yet moved still break at `max-width: 760px`,
  moved code at 48rem (768px). Converge as units land.
- **`sm:` at 640px** in `Reservation.tsx`, `ReservationForm.tsx` and
  `CommentTree.tsx` disagrees with both; check those layouts at 641–760px
  before aligning them to `md:`.
- **Written intent that never rendered**, kept as rendered by step 0 and worth
  a separate fix: the login password field's `pr-10` never applied, so a long
  password runs under the 48px reveal button; the reservation labels
  ("NEW MATCH REQUEST") were meant red and render grey.
- **The reservation form's rank plate** is covered by `RankImage`'s unit test
  only: every rank its picker offers has art, so no state can draw the plate
  there.

## Environment notes

- The dev server on :5173 is usually the user's; do not stop it. Without
  `BE=local` it proxies to production.
- Comparisons run against production builds served on other ports (4801…),
  never the dev server.
