import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

test.describe('Rooms', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/')
    await dismissPatchNotes(page)
  })

  test('rank match tab renders RankMatchTable with headers', async ({ page }) => {
    await expect(page.locator('table thead th', { hasText: '랭크' })).toBeVisible()
    await expect(page.locator('table thead th', { hasText: '플레이어 1' })).toBeVisible()
    await expect(page.locator('table thead th', { hasText: '플레이어 2' })).toBeVisible()
  })

  test('rank match shows player names from fixture', async ({ page }) => {
    await expect(page.locator('text=TTT2_Master')).toBeVisible()
    await expect(page.locator('text=KingOfIronFist')).toBeVisible()
    await expect(page.locator('text=TagComboKing')).toBeVisible()
  })

  test('player match tab renders PlayerMatchTable', async ({ page }) => {
    await page.locator('button.tab-btn', { hasText: '플매' }).click()

    // PlayerMatchTable has columns: #, User
    await expect(page.locator('table thead th', { hasText: '#' })).toBeVisible()
    await expect(page.locator('table thead th', { hasText: 'User' })).toBeVisible()
    await expect(page.locator('text=BearPunchPro').first()).toBeVisible()
  })

  test('refresh button is visible and triggers API call', async ({ page }) => {
    const refreshBtn = page.locator('button.refresh-btn')
    await expect(refreshBtn).toBeVisible()
    await expect(refreshBtn).toContainText('↻')

    const requestPromise = page.waitForRequest(/\/api\/rooms\/all/)
    await refreshBtn.click()
    await requestPromise
  })

  test('auto-refresh fetches rooms again within polling interval', async ({ page }) => {
    // useRooms polls every 10s — wait for a second request after page load
    // The first request already happened; wait for the next one
    const secondRequest = page.waitForRequest(
      (req) => req.url().includes('/api/rooms/all'),
      { timeout: 15_000 }
    )
    await secondRequest
  })

  test('no rooms shows empty message', async ({ page }) => {
    await mockAllApis(page, { rooms: { rank_match: [], player_match: [] } })
    await page.goto('/')

    await expect(page.locator('text=방이 없습니다.')).toBeVisible()
  })
})
