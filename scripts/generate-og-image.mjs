// Renders scripts/og-image.html to public/og-image.png at 1200x630.
//
// The card has to be a raster: Discord, KakaoTalk and X all ignore SVG in
// og:image, so the favicon cannot stand in for it. Chromium comes from the
// Playwright install the E2E suite already depends on - no new dependency.
//
//   node scripts/generate-og-image.mjs
//
// Re-run whenever the wording or the palette changes, and commit the PNG.
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, 'og-image.html')
const target = resolve(here, '..', 'public', 'og-image.png')

const WIDTH = 1200
const HEIGHT = 630

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
})

await page.goto(`file://${source}`)
// The card is set in Pretendard, same as the app; without this the shot can
// land while the fallback face is still showing.
await page.evaluate(() => document.fonts.ready)

await page.screenshot({ path: target, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } })
await browser.close()

console.log(`Wrote ${target} (${WIDTH}x${HEIGHT})`)
