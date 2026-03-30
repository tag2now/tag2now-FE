import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

const FROZEN_TIME = new Date('2026-03-30T12:00:00Z').getTime()

test.describe('Visual regression', () => {
  test.beforeEach(async ({ page }) => {
    // Freeze Date.now for deterministic relative timestamps
    await page.addInitScript(`{
      const _now = ${FROZEN_TIME};
      Date.now = () => _now;
      const _OrigDate = Date;
      class FrozenDate extends _OrigDate {
        constructor(...args) {
          if (args.length === 0) super(_now);
          else super(...args);
        }
      }
      window.Date = FrozenDate;
      window.Date.now = () => _now;
    }`)

    await mockAllApis(page)
  })

  async function disableAnimations(page: import('@playwright/test').Page) {
    await page.addStyleTag({
      content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
    })
  }

  test('rooms - rank match view', async ({ page }) => {
    await page.goto('/')
    await dismissPatchNotes(page)
    await disableAnimations(page)
    await page.locator('.panel').waitFor()
    await expect(page).toHaveScreenshot('rooms-rank-match.png', { maxDiffPixelRatio: 0.01 })
  })

  test('rooms - player match view', async ({ page }) => {
    await page.goto('/')
    await dismissPatchNotes(page)
    await disableAnimations(page)
    await page.locator('button.tab-btn', { hasText: '플매' }).click()
    await page.locator('table').waitFor()
    await expect(page).toHaveScreenshot('rooms-player-match.png', { maxDiffPixelRatio: 0.01 })
  })

  test('leaderboard view', async ({ page }) => {
    await page.goto('/')
    await dismissPatchNotes(page)
    await disableAnimations(page)
    await page.locator('button.tab-btn', { hasText: '리더보드' }).click()
    await page.locator('table').waitFor()
    await expect(page).toHaveScreenshot('leaderboard.png', { maxDiffPixelRatio: 0.01 })
  })

  test('community - post list', async ({ page }) => {
    await page.goto('/')
    await dismissPatchNotes(page)
    await disableAnimations(page)
    await page.locator('button.tab-btn', { hasText: '커뮤니티' }).click()
    await page.locator('text=Best tag combos').waitFor()
    await expect(page).toHaveScreenshot('community-list.png', { maxDiffPixelRatio: 0.01 })
  })

  test('error state', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms'] })
    await page.goto('/')
    await dismissPatchNotes(page)
    await disableAnimations(page)
    await page.locator('.state-msg.error').waitFor()
    await expect(page).toHaveScreenshot('error-state.png', { maxDiffPixelRatio: 0.01 })
  })

  test('loading state', async ({ page }) => {
    // Override routes to never respond — keeps app in loading state
    await page.route('**/api/rooms/all**', () => {})
    await page.route('**/api/leaderboard**', () => {})
    await page.goto('/')
    await dismissPatchNotes(page)
    await disableAnimations(page)
    await page.locator('.state-msg').first().waitFor()
    await expect(page).toHaveScreenshot('loading-state.png', { maxDiffPixelRatio: 0.01 })
  })
})
