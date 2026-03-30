import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/')
    await dismissPatchNotes(page)
  })

  test('page loads with first room group tab active', async ({ page }) => {
    // rank_match is first in GROUP_ORDER, label is "랭매"
    const activeTab = page.locator('button.tab-btn.active')
    await expect(activeTab).toBeVisible()
    await expect(activeTab).toContainText('랭매')
  })

  test('all expected tabs are visible', async ({ page }) => {
    const tabs = page.locator('button.tab-btn')
    // rank_match, player_match, leaderboard, community
    await expect(tabs).toHaveCount(4)
    await expect(tabs.nth(0)).toContainText('랭매')
    await expect(tabs.nth(1)).toContainText('플매')
    await expect(tabs.nth(2)).toContainText('리더보드')
    await expect(tabs.nth(3)).toContainText('커뮤니티')
  })

  test('tab shows room count in label', async ({ page }) => {
    const rankTab = page.locator('button.tab-btn', { hasText: '랭매' })
    // 2 rooms in rank_match fixture
    await expect(rankTab).toContainText('(2)')
  })

  test('clicking leaderboard tab shows leaderboard content', async ({ page }) => {
    await page.locator('button.tab-btn', { hasText: '리더보드' }).click()

    await expect(page.locator('text=Total records:')).toBeVisible()
    await expect(page.locator('table thead th', { hasText: 'Player' })).toBeVisible()
  })

  test('clicking community tab shows post list', async ({ page }) => {
    await page.locator('button.tab-btn', { hasText: '커뮤니티' }).click()

    // Community has filter buttons
    await expect(page.locator('button', { hasText: '전체' })).toBeVisible()
    await expect(page.locator('button', { hasText: '글쓰기' })).toBeVisible()
  })

  test('switching back to room tab shows rooms again', async ({ page }) => {
    // Go to leaderboard
    await page.locator('button.tab-btn', { hasText: '리더보드' }).click()
    await expect(page.locator('text=Total records:')).toBeVisible()

    // Go back to rank match
    await page.locator('button.tab-btn', { hasText: '랭매' }).click()
    await expect(page.locator('.panel-meta')).toContainText('room')
  })

  test('active tab styling updates on click', async ({ page }) => {
    const leaderboardTab = page.locator('button.tab-btn', { hasText: '리더보드' })
    await expect(leaderboardTab).not.toHaveClass(/active/)

    await leaderboardTab.click()
    await expect(leaderboardTab).toHaveClass(/active/)

    // Previous tab is no longer active
    const rankTab = page.locator('button.tab-btn', { hasText: '랭매' })
    await expect(rankTab).not.toHaveClass(/active/)
  })
})
