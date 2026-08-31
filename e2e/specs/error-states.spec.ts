import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

// panelStatus renders a failure as role="alert", so these assertions check what
// actually reaches the user instead of the class the panel happens to carry.
test.describe('Error states', () => {
  test('rooms API failure shows error message', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms'] })
    await page.goto('/')
    await dismissPatchNotes(page)

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Error:')
  })

  test('leaderboard API failure shows error on leaderboard tab', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['leaderboard'] })
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.getByRole('tab', { name: '리더보드' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Error:')
  })

  test('recovery after manual refresh', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms'] })
    await page.goto('/')
    await dismissPatchNotes(page)

    await expect(page.getByRole('alert')).toBeVisible()

    // Now fix the route to return success
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAllApis(page)

    // Re-navigating should recover
    await page.goto('/')
    await dismissPatchNotes(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText(/업데이트 \d+초 전/)).toBeVisible()
  })

  test('both APIs failing shows rooms error on default tab', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms', 'leaderboard'] })
    await page.goto('/')
    await dismissPatchNotes(page)

    await expect(page.getByRole('alert').first()).toBeVisible()
  })
})
