import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

// Locators here go through roles and accessible names on purpose: the tab strip
// is an ARIA tabs widget, so what a user — or a screen reader — can reach is the
// contract worth asserting. Class names are styling, and a redesign that only
// moves them should not turn this suite red.
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/')
    await dismissPatchNotes(page)
  })

  test('page loads with first room group tab active', async ({ page }) => {
    // Room groups live under the "매칭" tab; rank_match is first in GROUP_ORDER.
    await expect(page.getByRole('tab', { name: '매칭' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: /^랭매/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('all expected tabs are visible', async ({ page }) => {
    const mainTabs = page.getByRole('tablist', { name: 'Main navigation' }).getByRole('tab')
    await expect(mainTabs).toHaveText(['매칭', '예약', '리더보드', '커뮤니티', '통계'])

    const roomTabs = page.getByRole('tablist', { name: '매칭 종류 선택' }).getByRole('tab')
    await expect(roomTabs).toHaveCount(2)
    await expect(roomTabs.nth(0)).toHaveAccessibleName(/랭매/)
    await expect(roomTabs.nth(1)).toHaveAccessibleName(/플매/)
  })

  test('tab shows room count in label', async ({ page }) => {
    // 2 rooms in the rank_match fixture
    await expect(page.getByRole('tab', { name: '랭매 (2)' })).toBeVisible()
  })

  test('clicking leaderboard tab shows leaderboard content', async ({ page }) => {
    await page.getByRole('tab', { name: '리더보드' }).click()

    await expect(page.getByText('Total records: 5')).toBeAttached()
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible()
  })

  test('clicking community tab shows post list', async ({ page }) => {
    await page.getByRole('tab', { name: '커뮤니티' }).click()

    // Community has filter buttons
    await expect(page.getByRole('button', { name: '전체' })).toBeVisible()
    await expect(page.getByRole('button', { name: '글쓰기' })).toBeVisible()
  })

  test('switching back to room tab shows rooms again', async ({ page }) => {
    await page.getByRole('tab', { name: '리더보드' }).click()
    await expect(page.getByText('Total records: 5')).toBeAttached()

    await page.getByRole('tab', { name: '매칭' }).click()
    await expect(page.getByRole('columnheader', { name: '랭크' })).toBeVisible()
  })

  test('the selected tab moves on click', async ({ page }) => {
    const leaderboardTab = page.getByRole('tab', { name: '리더보드' })
    await expect(leaderboardTab).toHaveAttribute('aria-selected', 'false')

    await leaderboardTab.click()
    await expect(leaderboardTab).toHaveAttribute('aria-selected', 'true')

    // Only one tab is ever selected, so the previous one has to give it up.
    await expect(page.getByRole('tab', { name: '매칭' })).toHaveAttribute('aria-selected', 'false')
  })
})
