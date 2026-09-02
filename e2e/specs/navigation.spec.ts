import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes, goToMatchTab } from '../helpers/mock-api'

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

  test('page loads on the overview', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: '한눈에 보기' })).toBeVisible()

    // The room-type strip belongs to the match tab and stays out of the way.
    await expect(page.getByRole('tablist', { name: '매칭 종류 선택' })).toHaveCount(0)
  })

  test('the match tab opens on the first room group', async ({ page }) => {
    // Room groups live under the "매칭" tab; rank_match is first in GROUP_ORDER.
    await goToMatchTab(page)

    await expect(page.getByRole('tab', { name: '매칭' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: /^랭매/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('all expected tabs are visible', async ({ page }) => {
    const mainTabs = page.getByRole('tablist', { name: 'Main navigation' }).getByRole('tab')
    await expect(mainTabs).toHaveText(['개요', '매칭', '예약', '리더보드', '커뮤니티', '통계'])

    await goToMatchTab(page)
    const roomTabs = page.getByRole('tablist', { name: '매칭 종류 선택' }).getByRole('tab')
    await expect(roomTabs).toHaveCount(2)
    await expect(roomTabs.nth(0)).toHaveAccessibleName(/랭매/)
    await expect(roomTabs.nth(1)).toHaveAccessibleName(/플매/)
  })

  test('tab shows room count in label', async ({ page }) => {
    await goToMatchTab(page)

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

  // The skip link is the whole keyboard-only escape hatch past the header and
  // the sidebar. Three things have to hold: it comes before every other
  // control, activating it lands on main, and it is invisible until focused.
  test('the skip link precedes every other control in the tab order', async ({ page }) => {
    const order = await page.evaluate(() => {
      const sel = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      return Array.from(document.querySelectorAll<HTMLElement>(sel))
        .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed')
        .slice(0, 1)
        .map((el) => el.className)
    })
    expect(order[0]).toContain('skip-link')
  })

  test('focusing the skip link reveals it and it jumps to main', async ({ page }) => {
    const skipLink = page.getByRole('link', { name: '본문으로 건너뛰기' })
    await expect(skipLink).not.toBeInViewport()

    await skipLink.focus()
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeInViewport()

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#mainContent$/)
    await expect(page.locator('#mainContent')).toBeVisible()
  })

  test('the selected tab moves on click', async ({ page }) => {
    const leaderboardTab = page.getByRole('tab', { name: '리더보드' })
    await expect(leaderboardTab).toHaveAttribute('aria-selected', 'false')

    await leaderboardTab.click()
    await expect(leaderboardTab).toHaveAttribute('aria-selected', 'true')

    // Only one tab is ever selected, so the previous one has to give it up.
    await expect(page.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'false')
  })
})
