import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes, goToMatchTab, skipPatchNotes } from '../helpers/mock-api'

test.describe('Rooms', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/')
    await dismissPatchNotes(page)
    await goToMatchTab(page)
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

  test('no rooms shows empty message', async ({ page }) => {
    await mockAllApis(page, { rooms: { rank_match: [], player_match: [] } })
    // A fresh load re-opens the patch-notes dialog, which would swallow the tab
    // click; the beforeEach dismissal does not carry across this second goto.
    await page.goto('/')
    await dismissPatchNotes(page)
    await goToMatchTab(page)

    await expect(page.getByText('방이 없습니다.')).toBeVisible()
  })
})

test.describe('Rooms auto-refresh', () => {
  test('fetches rooms again once the poll interval elapses', async ({ page }) => {
    // useRooms polls every ROOMS_REFRESH_INTERVAL (5s). Waiting that out in real
    // time made this the slowest test in the suite, so the clock is faked and
    // advanced instead — same assertion, without the wall-clock cost.
    await page.clock.install()
    await skipPatchNotes(page)
    await mockAllApis(page)
    await page.goto('/')

    // Count only what arrives after the initial load, so advancing the clock is
    // the sole thing that can satisfy the assertion.
    let polls = 0
    page.on('request', (req) => {
      if (req.url().includes('/api/rooms/all')) polls += 1
    })

    // fastForward jumps to the target time instead of running every timer in
    // between, which runFor(5s) does — that replay cost 2.7s on its own.
    await page.clock.fastForward(5_100)
    await expect.poll(() => polls, { timeout: 5_000 }).toBeGreaterThan(0)
  })
})
