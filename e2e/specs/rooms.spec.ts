import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

test.describe('Rooms', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/')
    await dismissPatchNotes(page)
  })

  test('rank match tab renders RankMatchTable with headers', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: '랭크' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '플레이어 1' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '플레이어 2' })).toBeVisible()
  })

  test('rank match shows player names from fixture', async ({ page }) => {
    await expect(page.getByText('TTT2_Master')).toBeVisible()
    await expect(page.getByText('KingOfIronFist')).toBeVisible()
    await expect(page.getByText('TagComboKing')).toBeVisible()
  })

  test('player match tab renders PlayerMatchTable', async ({ page }) => {
    await page.getByRole('tab', { name: /^플매/ }).click()

    // PlayerMatchTable has columns: #, User
    await expect(page.getByRole('columnheader', { name: '#' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible()
    await expect(page.getByText('BearPunchPro').first()).toBeVisible()
  })

  test('refresh button is visible and triggers API call', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: '새로고침' })
    await expect(refreshBtn).toBeVisible()

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

    await expect(page.getByText('방이 없습니다.')).toBeVisible()
  })
})
