import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TOKEN_OF } from '@/shared/palette'

/** `tokens.css` is the palette, and this is what makes that true.
 *
 * `shared/palette.ts` is the one module allowed to hold a colour as a JS
 * string — Recharts writes SVG attributes and the medal/tier values are handed
 * to elements as an inline custom property, neither of which can read a token.
 * Every entry there declares the token it copies, and this walks that map.
 *
 * It is generated from the palette rather than listed by hand on purpose: a
 * hand-written list is a second place to forget something, which is the exact
 * failure this exists to catch. Adding a colour to the palette without adding
 * the token fails here, immediately.
 *
 * What it found when it was written: the chart's gold exported as
 * COLOR_SECONDARY while `--color-secondary` is #ff9aa0, a different colour;
 * the chart panel two values off `--color-bg-panel`; and a second medal
 * palette in `--color-silver` / `--color-bronze` disagreeing with the one the
 * rows actually painted.
 */
// Resolved from the project root, not from `import.meta.url`: Vitest serves
// this module over its own transform pipeline, so the module URL is an http one
// and `fileURLToPath` refuses it.
const TOKENS = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

function token(name: string): string {
  const match = TOKENS.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))
  if (!match) throw new Error(`styles/tokens.css declares no --${name}`)
  return match[1].trim().toLowerCase()
}

/** WCAG relative luminance, for the podium checks below. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('tokens.css is the only palette', () => {
  const mirrored = Object.entries(TOKEN_OF)

  it('mirrors at least the colours the charts and the podium need', () => {
    expect(mirrored.length).toBeGreaterThan(10)
  })

  it.each(mirrored)('%s is --%s', (hex, name) => {
    expect(hex.toLowerCase()).toBe(token(name))
  })

  // The stale pair that made "what colour is second place" a two-answer
  // question. Nothing should bring them back without bringing back the bug.
  it.each(['color-silver', 'color-bronze'])('no longer declares --%s', (name) => {
    expect(() => token(name)).toThrow()
  })
})

/** Two things the stylesheet can do that stylelint's colour rules cannot see,
 * both of which have already shipped a bug.
 *
 * `@apply text-white` is a Tailwind utility, not a colour declaration, so the
 * hex/rgb ban never looked at it — and `.player-name` was painting every name
 * pure #fff while --color-txt is #f2f2f3.
 *
 * The `background` shorthand resets background-image. The podium wash is a
 * background-image, so `.tbl-row:nth-child(even) { background: ... }` erased it
 * on every even row — and second place is always even, which is why silver was
 * the one medal with no wash at all.
 */
describe('the stylesheets cannot quietly undo the palette', () => {
  const SHEETS = ['base', 'primitives', 'shell', 'surfaces', 'overview', 'boards', 'history', 'leaderboard', 'responsive']
    .map((name) => [name, readFileSync(resolve(process.cwd(), `src/styles/${name}.css`), 'utf8')] as const)

  it.each(SHEETS)('%s.css uses no bare white or black utility', (_name, css) => {
    expect(css).not.toMatch(/@apply[^;]*\b(?:text|bg|border|fill|stroke)-(?:white|black)\b/)
  })

  // Only rows can carry the wash, so only rows are checked — plenty of other
  // surfaces set `background` legitimately and have no image to lose.
  it.each(SHEETS)('%s.css sets row backgrounds with background-color', (_name, css) => {
    const rowRules = css.split(/\r?\n/).filter((line) => /^\.[^{]*(?:tbl-row|rank-row)[^{]*\{/.test(line.trim()))
    for (const rule of rowRules) {
      expect(rule).not.toMatch(/[^-]background:/)
    }
  })
})

describe('the podium colours are colours, not white', () => {
  const BODY_TEXT = '#f2f2f3'
  const PANEL = '#17171b'
  const medals = ['color-medal-gold', 'color-medal-silver', 'color-medal-bronze']

  // Silver failed this. At #dbe3ef it was 1.16 against body text — a medal that
  // reads as an ordinary unranked name, which is the whole thing the colour is
  // there to prevent. Gold clears it on chroma; silver has to clear it on
  // luminance, because a silver saturated like gold is not silver any more.
  it.each(medals)('--%s is distinguishable from body text', (name) => {
    expect(contrast(token(name), BODY_TEXT)).toBeGreaterThan(1.3)
  })

  // Each one is also the colour of the rank numeral and the player's name on
  // its row, so it has to clear 4.5:1 on the panel it sits on.
  it.each(medals)('--%s is legible on the panel', (name) => {
    expect(contrast(token(name), PANEL)).toBeGreaterThan(4.5)
  })
})
