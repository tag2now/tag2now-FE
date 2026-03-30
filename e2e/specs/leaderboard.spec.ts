import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.locator('button.tab-btn', { hasText: '리더보드' }).click()
  })

  test('shows total records count', async ({ page }) => {
    await expect(page.locator('.panel-meta')).toContainText('Total records: 5')
  })

  test('renders table with correct column headers', async ({ page }) => {
    const headers = page.locator('table thead th')
    await expect(headers.nth(0)).toContainText('#')
    await expect(headers.nth(1)).toContainText('Player')
    await expect(headers.nth(2)).toContainText('Main')
    await expect(headers.nth(3)).toContainText('Sub')
  })

  test('renders player entries from fixture', async ({ page }) => {
    await expect(page.locator('text=TTT2_Master')).toBeVisible()
    await expect(page.locator('text=KingOfIronFist')).toBeVisible()
    await expect(page.locator('text=TagComboKing')).toBeVisible()
    await expect(page.locator('text=BearPunchPro')).toBeVisible()
    await expect(page.locator('text=NewChallenger')).toBeVisible()
  })

  test('shows rank numbers in order', async ({ page }) => {
    const rows = page.locator('table tbody tr.tbl-row')
    await expect(rows).toHaveCount(5)

    // First row rank should be 1
    const firstRankCell = rows.nth(0).locator('td').first()
    await expect(firstRankCell).toContainText('1')
  })

  test('refresh button triggers leaderboard API call', async ({ page }) => {
    const refreshBtn = page.locator('button.refresh-btn')
    await expect(refreshBtn).toBeVisible()

    const requestPromise = page.waitForRequest(/\/api\/leaderboard/)
    await refreshBtn.click()
    await requestPromise
  })

  test('player with no sub character shows dash', async ({ page }) => {
    // BearPunchPro has sub_char_info: null
    const bearRow = page.locator('tr.tbl-row', { hasText: 'BearPunchPro' })
    // The sub character cell (4th td) should show "—"
    await expect(bearRow.locator('td').nth(3)).toContainText('—')
  })
})
