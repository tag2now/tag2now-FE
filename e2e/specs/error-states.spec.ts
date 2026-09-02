import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes, goToMatchTab } from '../helpers/mock-api'

// panelStatus renders a failure as role="alert", so these assertions check what
// actually reaches the user instead of the class the panel happens to carry.
test.describe('Error states', () => {
  test('rooms API failure shows error message', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms'] })
    await page.goto('/')
    await dismissPatchNotes(page)
    await goToMatchTab(page)

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    // What reaches the user is the instruction plus a way out; the raw server
    // message stays as a detail line beneath it.
    await expect(alert).toContainText('불러오지 못했습니다')
    await expect(alert.getByRole('button', { name: '다시 시도' })).toBeVisible()
  })

  test('leaderboard API failure shows error on leaderboard tab', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['leaderboard'] })
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.getByRole('tab', { name: '리더보드' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('불러오지 못했습니다')
    await expect(alert.getByRole('button', { name: '다시 시도' })).toBeVisible()
  })

  test('recovery after manual refresh', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms'] })
    await page.goto('/')
    await dismissPatchNotes(page)
    await goToMatchTab(page)

    await expect(page.getByRole('alert')).toBeVisible()

    // Now fix the route to return success
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAllApis(page)

    // Re-navigating should recover
    await page.goto('/')
    await dismissPatchNotes(page)
    await goToMatchTab(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText(/업데이트 \d+초 전/)).toBeVisible()
  })

  test('the retry button recovers without a reload', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms'] })
    await page.goto('/')
    await dismissPatchNotes(page)
    await goToMatchTab(page)

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAllApis(page)
    await alert.getByRole('button', { name: '다시 시도' }).click()

    // The point of the control: the user gets out of the error state from
    // inside it, without knowing to reload the page.
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('both APIs failing shows the rooms error on the match tab', async ({ page }) => {
    await mockAllApis(page, { failEndpoints: ['rooms', 'leaderboard'] })
    await page.goto('/')
    await dismissPatchNotes(page)
    await goToMatchTab(page)

    await expect(page.getByRole('alert').first()).toBeVisible()
  })
})
