import { test, expect } from '@playwright/test'
import { mockAllApis, skipPatchNotes } from '../helpers/mock-api'

/** The colour literals scattered through the stylesheet were replaced with
 * `color-mix` off the tokens. That substitution is only safe if the browser
 * resolves the two to the same pixels, and nothing else in this repository
 * would notice if it did not — there are no committed visual baselines, and a
 * unit test cannot compute a used value.
 *
 * So this asks the browser directly. Note that comparing the *strings*
 * `getComputedStyle` returns does not work: a `color-mix()` serialises as
 * `color(srgb 0.0823529 …)` while the literal it replaced serialises as
 * `rgba(21, 21, 23, 0.97)`. Those are the same colour. The comparison therefore
 * rasterises both through a canvas and compares the bytes that come out, which
 * is the question that actually matters.
 *
 * It lives in `e2e/visual`, which CI skips, for the same reason the screenshots
 * do — but unlike them it needs no baseline file, so it works on a clean
 * checkout and is worth running locally after touching the tokens.
 */

/** The expected value is the *current* token, not the literal that was there
 * before the palette moved: `--color-bg-deep`, `-panel` and `-row` were
 * deliberately respread to put a visible step between the page and the cards on
 * it — they used to sit 6/255 apart. What this still guards is that a
 * `color-mix` off a token resolves to the same pixels as writing that token's
 * value out by hand, which is the property the migration depended on. */
const SUBSTITUTIONS: Record<string, [string, string]> = {
  panelAt97: ['color-mix(in srgb, var(--color-bg-panel) 97%, transparent)', 'rgba(23, 23, 27, 0.97)'],
  deepAt96: ['color-mix(in srgb, var(--color-bg-deep) 96%, transparent)', 'rgba(8, 8, 10, 0.96)'],
  scrimAt82: ['color-mix(in srgb, var(--color-scrim) 82%, transparent)', 'rgba(6, 6, 8, 0.82)'],
  secondaryAt35: ['color-mix(in srgb, var(--color-secondary) 35%, transparent)', 'rgba(255, 154, 160, 0.35)'],
  shadeAt10: ['color-mix(in srgb, var(--color-shade) 10%, transparent)', 'rgba(0, 0, 0, 0.1)'],
  primaryAt12: ['color-mix(in srgb, var(--color-primary) 12%, transparent)', 'rgba(230, 57, 70, 0.12)'],
  primaryAt55: ['color-mix(in srgb, var(--color-primary) 5.5%, transparent)', 'rgba(230, 57, 70, 0.055)'],
  tintAt6: ['color-mix(in srgb, var(--color-surface-tint) 6%, transparent)', 'rgba(255, 255, 255, 0.06)'],
  tintAt15: ['color-mix(in srgb, var(--color-surface-tint) 1.5%, transparent)', 'rgba(255, 255, 255, 0.015)'],
  row: ['var(--color-bg-row)', 'rgb(33, 33, 39)'],
  field: ['var(--color-bg-field)', 'rgb(27, 27, 31)'],
  sunken: ['var(--color-bg-sunken)', 'rgb(18, 18, 20)'],
  head: ['var(--color-bg-head)', 'rgb(26, 26, 30)'],
  float: ['var(--color-bg-float)', 'rgb(28, 28, 33)'],
  fieldFocus: ['var(--color-bg-field-focus)', 'rgb(35, 35, 41)'],
  embed: ['var(--color-bg-embed)', 'rgb(9, 9, 9)'],
  muted: ['var(--color-txt-muted)', 'rgb(147, 147, 156)'],
  disabled: ['var(--color-txt-disabled)', 'rgb(122, 122, 130)'],
  bright: ['var(--color-primary-bright)', 'rgb(255, 90, 99)'],
}

test.describe('token substitution', () => {
  test('resolves every migrated colour to the pixels of the literal it replaced', async ({ page }) => {
    await skipPatchNotes(page)
    await mockAllApis(page)
    await page.goto('/')

    const results = await page.evaluate((cases) => {
      const probe = document.createElement('div')
      document.body.appendChild(probe)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')!

      /** Resolve a CSS expression against the page's tokens, then rasterise it
       * over a mid grey so an alpha difference shows up as a pixel difference. */
      const pixels = (expression: string): number[] => {
        probe.style.color = ''
        probe.style.color = expression
        const resolved = getComputedStyle(probe).color
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = '#808080'
        ctx.fillRect(0, 0, 1, 1)
        ctx.fillStyle = resolved
        ctx.fillRect(0, 0, 1, 1)
        return [...ctx.getImageData(0, 0, 1, 1).data]
      }

      const out: Record<string, { got: number[], want: number[] }> = {}
      for (const [name, [expression, literal]] of Object.entries(cases)) {
        out[name] = { got: pixels(expression), want: pixels(literal) }
      }
      probe.remove()
      return out
    }, SUBSTITUTIONS)

    for (const [name, { got, want }] of Object.entries(results)) {
      // One byte of slack: the two paths round the same value through different
      // arithmetic, and a difference of 1/255 is not a colour change.
      expect(got.length, `${name} produced no pixels`).toBe(4)
      got.forEach((channel, index) => {
        expect(
          Math.abs(channel - want[index]),
          `${name} channel ${index}: got ${got.join(',')}, want ${want.join(',')}`,
        ).toBeLessThanOrEqual(1)
      })
    }
  })

  test('keeps the modal veil at the exact value it always had', async ({ page }) => {
    await skipPatchNotes(page)
    await mockAllApis(page)
    await page.goto('/reservation')

    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const backdrop = page.locator('.modal-backdrop')
    await expect(backdrop).toBeVisible()

    // The veil is #060608, two points darker than --color-bg-deep. Mixing it
    // from the ground token would have lightened it, so it got a token of its
    // own and the migration stayed pixel-for-pixel.
    const painted = await backdrop.evaluate((element) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = getComputedStyle(element).backgroundColor
      ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data]
    })
    // Same one-byte slack as above: color-mix reaches #060608 through different
    // arithmetic and lands on 9 rather than 8 in the blue channel.
    ;[6, 6, 8, 209].forEach((want, index) => {
      expect(Math.abs(painted[index] - want), `channel ${index} of ${painted.join(',')}`).toBeLessThanOrEqual(1)
    })
  })
})
