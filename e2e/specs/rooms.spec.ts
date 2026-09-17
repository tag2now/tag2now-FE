import { test, expect } from '@playwright/test'
import { goToMatchTab, mockAllApis, skipPatchNotes } from '../helpers/mock-api'

test.describe('Rooms', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await skipPatchNotes(page)
    await page.goto('/')
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

  // A row is a lobby here, the same as on the rank tab — it used to be a person,
  // so the toolbar's room count sat above a different number of rows.
  test('player match tab lists one row per lobby', async ({ page }) => {
    await page.getByRole('tab', { name: /^플매/ }).click()

    for (const name of ['호스트', '참가자', '인원']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible()
    }
    const row = page.getByRole('row', { name: /BearPunchPro/ })
    await expect(row).toHaveCount(1)
    // The host is named once, in its own column, not repeated as a guest.
    await expect(row.getByText('BearPunchPro')).toHaveCount(1)
  })

  test('refresh button is visible and triggers API call', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: '새로고침' })
    await expect(refreshBtn).toBeVisible()

    const requestPromise = page.waitForRequest(/\/api\/rooms\/all/)
    await refreshBtn.click()
    await requestPromise
  })

  /* A waiting row lays its names out beside the rank image. On phones a
   * full-width button rule meant for the in-game cells once pushed every name
   * onto a line of its own below the image — still visible, still clickable,
   * so only comparing boxes catches it. */
  test('waiting players sit on the same line as their rank image', async ({ page }) => {
    const warrior = { id: 2, name: 'Warrior', tier: 'B' }
    await mockAllApis(page, {
      rooms: {
        rank_match: [
          { room_id: 1002, owner_online_name: 'TagComboKing', rank_info: warrior, max_slots: 2, users: [{ online_name: 'TagComboKing', np_id: 'u003' }] },
          { room_id: 1003, owner_online_name: 'Kaz', rank_info: warrior, max_slots: 2, users: [{ online_name: 'Kaz', np_id: 'u007' }] },
        ],
        player_match: [],
      },
    })
    await page.goto('/')
    await goToMatchTab(page)

    const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'TagComboKing' }) })
    const image = (await row.getByRole('img', { name: 'Warrior' }).boundingBox())!
    const name = (await row.getByRole('button', { name: 'TagComboKing' }).boundingBox())!
    const nameCenter = name.y + name.height / 2
    expect(nameCenter).toBeGreaterThan(image.y)
    expect(nameCenter).toBeLessThan(image.y + image.height)
  })

  /* A loaded record is taller than a phone. Unbounded, the dialog ran past
   * both edges and the backdrop scrolled with it, so it read as a page of its
   * own rather than a popup. It has to stay inside the screen with the page
   * still showing around it, and scroll its own body instead. */
  test('the player record stays a popup inside the phone screen', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Desktop has the height; the cramped case is the phone.')
    // Routed here: mockAllApis leaves player history to whatever the dev
    // server proxies to, which is production.
    await page.route('**/api/history/players/**', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        npid: 'u001',
        days_active: 25,
        times_seen: 547,
        first_seen: '2026-08-16T00:00:00Z',
        last_seen: '2026-09-14T00:00:00Z',
        room_type_counts: {},
        top_played_with: [
          { npid: 'u002', online_name: 'KingOfIronFist', times_together: 126 },
          { npid: 'u003', online_name: 'TagComboKing', times_together: 117 },
          { npid: 'u004', online_name: 'BearPunchPro', times_together: 64 },
          { npid: 'u005', online_name: 'NewChallenger', times_together: 53 },
        ],
        active_hours: [0, 1, 22, 23],
      }),
    }))

    await page.getByRole('button', { name: 'TTT2_Master' }).click()
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: '플레이어 기록 닫기' }) })
    await expect(dialog.getByRole('heading', { name: '자주 함께한 플레이어' })).toBeVisible()

    const box = (await dialog.boundingBox())!
    const viewport = page.viewportSize()!
    expect(box.y).toBeGreaterThanOrEqual(16)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 16)
  })

  test('no rooms shows empty message', async ({ page }) => {
    await mockAllApis(page, { rooms: { rank_match: [], player_match: [] } })
    await page.goto('/')
    await goToMatchTab(page)

    await expect(page.getByText(/방이 없습니다/)).toBeVisible()
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
