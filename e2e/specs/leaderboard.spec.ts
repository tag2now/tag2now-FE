import { test, expect } from '@playwright/test'
import { mockAllApis, skipPatchNotes } from '../helpers/mock-api'

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await skipPatchNotes(page)
    await page.goto('/')
    await page.locator('button.tab-btn', { hasText: '리더보드' }).click()
  })

  test('shows total records count', async ({ page }) => {
    await expect(page.getByText('Total records: 5')).toBeAttached()
  })

  // The board is a grid carrying the table roles rather than a <table>: the
  // phone layout puts the figure under the name, which table layout cannot
  // express, and this list is the one the home page and 통계 also draw.
  test('renders the ranking with correct column headers', async ({ page, isMobile }) => {
    const headers = page.getByRole('columnheader')
    // The combined record sits between the name and the two characters: it is
    // what the 승률/판수 sorts order by, so it has to be visible to be trusted.
    // A phone has room for four tracks, so it moves under the name instead and
    // gives up its heading — "88% 605판" under a name needs no label.
    await expect(headers).toHaveText(isMobile
      ? ['#', 'Player', 'Main', 'Sub']
      : ['#', 'Player', '전적', 'Main', 'Sub'])
  })

  test('renders player entries from fixture', async ({ page }) => {
    // Scoped to the board: these names also appear in the overview's cards and
    // in community post rows, so a bare text= matches several elements.
    const names = page.locator('.rank-row button.player-btn')
    await expect(names).toHaveText([
      'TTT2_Master',
      'KingOfIronFist',
      'TagComboKing',
      'BearPunchPro',
      'NewChallenger',
    ])
  })

  test('shows rank numbers in order', async ({ page }) => {
    const rows = page.locator('.rank-row')
    await expect(rows).toHaveCount(5)

    // First row rank should be 1
    await expect(rows.nth(0).getByRole('cell').first()).toContainText('1')
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
    const bearRow = page.locator('.rank-row', { hasText: 'BearPunchPro' })
    // Cells are #, player, record, main, sub — the sub is the fifth.
    await expect(bearRow.getByRole('cell').nth(4)).toContainText('—')
  })

  // 자주 함께한 플레이어 named four people and did nothing when you pressed
  // one --- the only place in this dialog where a name was a dead end.
  test('a partner in the history panel opens that player, and back returns', async ({ page }) => {
    await page.getByRole('button', { name: 'TTT2_Master' }).first().click()
    const title = page.locator('#history-title')
    await expect(title).toHaveText('np_001')

    await page.locator('.history-partner-row').first().click()
    await expect(title).toHaveText('np_002')
    // The partner is looked up on the board the caller handed down, so they
    // arrive with their rank rather than as a bare npid.
    await expect(page.locator('.history-rank-summary')).toBeVisible()

    // The way back names who it returns to, so it cannot be mistaken for close.
    const back = page.getByRole('button', { name: /np_001/ })
    await back.click()
    await expect(title).toHaveText('np_001')
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
    await skipPatchNotes(page)
    await page.goto('/')
    await page.locator('button.tab-btn', { hasText: '리더보드' }).click()
  })

  // Opens collapsed: the live board is 344 entries, which rendered in full made
  // the page ~27,000px tall.
  test('opens on the top 100 rather than the whole board', async ({ page }) => {
    await expect(page.locator('.rank-row')).toHaveCount(100)
    await expect(page.locator('.lb-count')).toHaveText('100 / 150')
  })

  test('expands to the whole board and collapses back', async ({ page }) => {
    await page.getByRole('button', { name: '전체 보기' }).click()
    await expect(page.locator('.rank-row')).toHaveCount(150)

    await page.getByRole('button', { name: '상위 100위만' }).click()
    await expect(page.locator('.rank-row')).toHaveCount(100)
  })

  test('finds a player ranked past 100 while collapsed', async ({ page }) => {
    await page.getByLabel('플레이어 검색').fill('player130')

    const rows = page.locator('.rank-row')
    await expect(rows).toHaveCount(1)
    await expect(rows.first().getByRole('cell').first()).toHaveText('130')
  })

  // The 60-portrait grid is folded behind a disclosure — it used to be the
  // first thing on the page — so the tile is reached by opening it.
  test('filters by character', async ({ page }) => {
    await page.getByRole('button', { name: '캐릭터 필터', exact: true }).click()
    await page.getByRole('button', { name: 'Jin', exact: true }).click()

    await expect(page.locator('.rank-row')).toHaveCount(75)
    await expect(page.locator('.lb-count')).toHaveText('75 / 150')
    // The control that opened the grid now reports what is filtered.
    await expect(page.getByRole('button', { name: '캐릭터 필터: Jin' })).toBeVisible()
  })

  test('reports when nothing matches the search', async ({ page }) => {
    await page.getByLabel('플레이어 검색').fill('nobody-here')

    await expect(page.locator('.rank-row')).toHaveCount(0)
    await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()
  })
})
