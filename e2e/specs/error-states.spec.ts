import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

test.describe('Error states', () => {
  test('rooms API failure shows error message', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms'] })
    await page.goto('/')
    await dismissPatchNotes(page)

    await expect(page.locator('.state-msg.error')).toBeVisible()
    await expect(page.locator('.state-msg.error')).toContainText('Error:')
  })

  test('leaderboard API failure shows error on leaderboard tab', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['leaderboard'] })
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.locator('button.tab-btn', { hasText: '리더보드' }).click()

    await expect(page.locator('.state-msg.error')).toBeVisible()
    await expect(page.locator('.state-msg.error')).toContainText('Error:')
  })

  test('recovery after manual refresh', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms'] })
    await page.goto('/')
    await dismissPatchNotes(page)

    await expect(page.locator('.state-msg.error')).toBeVisible()

    // Now fix the route to return success
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAllApis(page)

    // Re-navigating should recover
    await page.goto('/')
    await dismissPatchNotes(page)
    await expect(page.locator('.panel-meta')).toContainText('room')
  })

  test('both APIs failing shows rooms error on default tab', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms', 'leaderboard'] })
    await page.goto('/')
    await dismissPatchNotes(page)

    await expect(page.locator('.state-msg.error').first()).toBeVisible()
  })
})
