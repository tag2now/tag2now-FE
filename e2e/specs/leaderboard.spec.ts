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
    await expect(page.locator('.panel-meta').first()).toContainText('Total records: 5')
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

/** A board bigger than the 100-row default view, to exercise the toggle and search. */
function largeBoard(size: number) {
  const entries = Array.from({ length: size }, (_, i) => ({
    np_id: `p${i + 1}`,
    rank: i + 1,
    online_name: `player${i + 1}`,
    score: size - i,
    player_info: {
      main_char_info: { name: i % 2 === 0 ? 'Kazuya' : 'Jin', wins: 10, losses: 5 },
      sub_char_info: null,
    },
  }))
  return { total_records: size, entries }
}

test.describe('Leaderboard search, filter and toggle', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, { leaderboard: largeBoard(150) })
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.locator('button.tab-btn', { hasText: '리더보드' }).click()
  })

  test('shows the whole board by default', async ({ page }) => {
    await expect(page.locator('table tbody tr.tbl-row')).toHaveCount(150)
    await expect(page.locator('.lb-count')).toHaveText('150 / 150')
  })

  test('collapses to the top 100 and expands back', async ({ page }) => {
    await page.getByRole('button', { name: '상위 100위만' }).click()
    await expect(page.locator('table tbody tr.tbl-row')).toHaveCount(100)

    await page.getByRole('button', { name: '전체 보기' }).click()
    await expect(page.locator('table tbody tr.tbl-row')).toHaveCount(150)
  })

  test('finds a player ranked past 100 while collapsed', async ({ page }) => {
    await page.getByRole('button', { name: '상위 100위만' }).click()
    await page.getByLabel('플레이어 검색').fill('player130')

    const rows = page.locator('table tbody tr.tbl-row')
    await expect(rows).toHaveCount(1)
    await expect(rows.first().locator('td').first()).toHaveText('130')
  })

  test('filters by character', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by Jin', exact: true }).click()

    await expect(page.locator('table tbody tr.tbl-row')).toHaveCount(75)
    await expect(page.locator('.lb-count')).toHaveText('75 / 150')
  })

  test('reports when nothing matches the search', async ({ page }) => {
    await page.getByLabel('플레이어 검색').fill('nobody-here')

    await expect(page.locator('table tbody tr.tbl-row')).toHaveCount(0)
    await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()
  })
})
