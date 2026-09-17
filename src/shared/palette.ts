/** Every colour this app holds as a JavaScript string, and the token each one
 * copies. The one file with hex literals in it.
 *
 * `styles/tokens.css` is the palette. Some of it has to exist in JS as well,
 * for two reasons and no others:
 *
 *   - Recharts writes SVG presentation attributes, which cannot read a custom
 *     property, so a chart series' colour has to arrive as a string.
 *   - Medal and tier colours are handed to elements as an inline `--medal` /
 *     `--tier`, which `color-mix()` then resolves. A custom property whose
 *     value is itself `var(--something)` does not survive that in every engine.
 *
 * These lived in three separate modules, each with its own hex literals and
 * its own "keep in step with tokens.css" comment, and none of them were: the
 * chart's gold was exported as COLOR_SECONDARY while `--color-secondary` is a
 * completely different colour, the chart panel was two values off
 * `--color-bg-panel`, and a second medal palette sat in `--color-silver` /
 * `--color-bronze` disagreeing with the one the rows actually painted.
 *
 * One file, one map, and `styles/tokens.test.ts` walks `TOKEN_OF` and fails on
 * any entry that does not equal its token — so adding a colour here without
 * adding the token is a test failure, not a discovery six months later.
 */

/** hex value → the token in styles/tokens.css it mirrors. */
export const TOKEN_OF: Record<string, string> = {}

/** Declare a mirrored colour. The token name is the point: it is what makes
 * this a copy of something rather than a second opinion. */
function mirror(token: string, hex: string): string {
  TOKEN_OF[hex] = token
  return hex
}

// ─── Surfaces and text ──────────────────────────────────────
export const PRIMARY = mirror('color-primary', '#e63946')
export const TXT_DIM = mirror('color-txt-dim', '#a3a3ad')
export const TXT_FAINT = mirror('color-txt-faint', '#8e8e98')
export const BG_PANEL = mirror('color-bg-panel', '#17171b')

// ─── Podium ─────────────────────────────────────────────────
/** Silver is the hard one. It was #dbe3ef, which has a chroma of 20 — very
 * nearly achromatic — at a luminance of .76, so it landed 1.16:1 against
 * --color-txt (#f2f2f3) and simply read as ordinary white text beside an
 * unranked name. Gold manages 1.42 and bronze 2.21 because both carry real
 * chroma; silver has to buy the same separation with luminance instead, since
 * a silver with gold's saturation is no longer silver. At #b0c4de it is 1.59
 * against body text and still 10:1 on the panel. */
export const MEDAL_GOLD = mirror('color-medal-gold', '#f2c85c')
export const MEDAL_SILVER = mirror('color-medal-silver', '#b0c4de')
export const MEDAL_BRONZE = mirror('color-medal-bronze', '#e0935c')

// ─── Chart series ───────────────────────────────────────────
export const CHART_PEAK = mirror('color-chart-peak', '#c9a84c')
export const CHART_AVG = mirror('color-chart-avg', '#7f8da0')

// ─── Rank bands ─────────────────────────────────────────────
export const TIER_TEAL = mirror('color-tier-teal', '#2dd4bf')
export const TIER_GREEN = mirror('color-tier-green', '#4ade80')
export const TIER_YELLOW = mirror('color-tier-yellow', '#facc15')
export const TIER_ORANGE = mirror('color-tier-orange', '#fb923c')
export const TIER_RED = mirror('color-tier-red', '#f87171')
export const TIER_BLUE = mirror('color-tier-blue', '#60a5fa')
export const TIER_PURPLE = mirror('color-tier-purple', '#c084fc')
export const TIER_GOLD = mirror('color-tier-gold', '#e4bd67')

/** Not a token: Recharts draws its gridlines over the panel and needs a colour
 * with alpha, which no token carries. It is the one value here that is not a
 * copy of anything, so it is named as such rather than sitting in the list
 * above pretending to be mirrored. */
export const CHART_GRID = 'rgba(255,255,255,.10)'
