import { test, expect } from '@playwright/test'
import { mockAllApis, reservationAt, skipPatchNotes } from '../helpers/mock-api'

// The overview is a summary, so what is worth asserting is that each card
// reflects its own source and that the links out actually change tabs — not the
// layout, which the visual suite covers.
test.describe('Overview', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, {
      reservations: [
        reservationAt(20, { id: 1, host_display_name: '모집중호스트', capacity: 4, participant_count: 1 }),
        reservationAt(21, { id: 2, host_display_name: '자리없음호스트', capacity: 2, participant_count: 2 }),
      ],
    })
    await skipPatchNotes(page)
    await page.goto('/')
  })

  test("shows live room figures alongside today's unique players", async ({ page }) => {
    const players = page.locator('.kpi-card', { hasText: '지금 접속' })
    await expect(players).toContainText('6')  // rooms fixture: 6 users across both groups
    // The rooms are a detail of that figure now, not a card of their own: two
    // cards printed the same number whenever every room held one player.
    await expect(players).toContainText('방 3개')

    // 일별 fixture의 unique_players가 172 → 149로 끝나므로 힌트는 전날 값.
    await expect(page.getByText('어제 172명')).toBeVisible()
  })

  // The third card reports the roster, not the reservations: 모집 중인 예약 is
  // the section immediately below this row, with the same appointments listed
  // by time and free seats, so the card was the weaker copy of it.
  test('heads the row with the registered total, not a second reservation count', async ({ page }) => {
    const registered = page.locator('.kpi-card', { hasText: '등록 플레이어' })
    await expect(registered.locator('.kpi-card-value')).toHaveText('5')  // leaderboard fixture
    await expect(registered).toHaveAttribute('href', '/leaderboard')
    await expect(page.locator('.kpi-grid')).not.toContainText('모집 중인 예약')
  })

  test('summarises each feature from its own endpoint', async ({ page }) => {
    await expect(page.getByText('132판')).toBeVisible()
    await expect(page.getByText('모집중호스트')).toBeVisible()
  })

  test('joins weekly players to their leaderboard characters', async ({ page }) => {
    const weekly = page.getByRole('region', { name: '주간 철악귀' })

    // TagComboKing tops the weekly fixture and plays Lars/Alisa on the
    // leaderboard; the portraits have to come from that join, not the weekly
    // endpoint, which knows only match counts.
    const top = weekly.locator('.rank-row').first()
    await expect(top.locator('img[alt="Lars"]')).toBeVisible()
    await expect(top.locator('img[alt="Alisa"]')).toBeVisible()

    // A weekly player absent from the leaderboard keeps its columns as dashes.
    const unranked = weekly.locator('.rank-row', { hasText: 'UnrankedPlayer' })
    await expect(unranked.locator('.mini-char.is-empty')).toHaveCount(2)
  })

  test('gives the weekly figure its own column beside the name', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The mobile overview drops the character columns.')
    const top = page.getByRole('region', { name: '주간 철악귀' }).locator('.rank-row').first()
    const nameBox = await top.locator('.rank-name').boundingBox()
    const nameLabel = top.locator('.rank-btn-label')
    const detailBox = await top.locator('.rank-detail').boundingBox()
    // The visible figure only. The cell also carries the count it was taken
    // over and an sr-only label naming what it counts, and measuring the whole
    // element would measure those too.
    const figureBox = await top.locator('.rank-detail strong').evaluate(element => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const rect = range.getBoundingClientRect()
      return { x: rect.x, width: rect.width, lines: range.getClientRects().length }
    })
    const rankBox = await top.locator('.mini-char-rank').first().boundingBox()
    const portraitBox = await top.locator('.mini-char-portrait').first().boundingBox()

    expect(nameBox).not.toBeNull()
    expect(detailBox).not.toBeNull()
    expect(rankBox).not.toBeNull()
    expect(portraitBox).not.toBeNull()
    // A column of its own, between the name and the characters: the cards are
    // stacked at full width now, so the figure can be read straight down the
    // list under its own heading rather than hiding under each name.
    expect(detailBox!.x).toBeGreaterThanOrEqual(nameBox!.x + nameBox!.width - 1)
    expect(detailBox!.x + detailBox!.width).toBeLessThanOrEqual(rankBox!.x + 1)
    // Neither spills into the character cells beside them.
    expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(rankBox!.x)
    // Three-digit weekly counts are routine (the fixture's top player has 132),
    // and a column too narrow for them broke "132판" across two lines — which
    // a box-based check would still pass, since it measures the wrapped box.
    expect(figureBox.lines).toBe(1)
    // The markup keeps the whole name; CSS shortens it with an ellipsis only
    // when the column runs out, and the label never spills into the figure.
    const labelBox = await nameLabel.boundingBox()
    expect(labelBox).not.toBeNull()
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(detailBox!.x + 1)
    await expect(nameLabel).toHaveText('TagComboKing')
    // The same art at the same size as the leaderboard's own cell --- these two
    // lists show the same players, and differing on size made them look like
    // different data. The figures are --rank-art-w / --rank-art-h and the
    // portrait height .mini-char-portrait sets; a change here should be a
    // change to the token, not to this list alone.
    const artSizes = await top.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      return { w: root.getPropertyValue('--rank-art-w').trim(), h: root.getPropertyValue('--rank-art-h').trim() }
    })
    expect(`${rankBox!.width}px`).toBe(artSizes.w)
    expect(`${rankBox!.height}px`).toBe(artSizes.h)
    expect(portraitBox!.height).toBeCloseTo(46, 1)
  })

  test('omits a reservation nobody can still join', async ({ page }) => {
    await expect(page.getByText('모집중호스트')).toBeVisible()
    await expect(page.getByText('자리없음호스트')).toHaveCount(0)
  })

  test('each section links to the tab it summarises', async ({ page }) => {
    const section = page.getByRole('region', { name: '주간 철악귀' })
    // A real link, not a button: middle-click opens it in a tab and the back
    // button undoes the jump, neither of which a click handler would give.
    await section.getByRole('link', { name: '통계' }).click()

    await expect(page).toHaveURL(/\/stats$/)
    // Scoped to the main nav: the stats tab has sub-tabs of its own whose names
    // would otherwise match ("접속자 통계").
    const nav = page.getByRole('tablist', { name: 'Main navigation' })
    await expect(nav.getByRole('tab', { name: '통계' })).toHaveAttribute('aria-selected', 'true')
    await expect(nav.getByRole('tab', { name: '홈' })).toHaveAttribute('aria-selected', 'false')
  })

  // The summary rows are entry points, not just readouts: clicking one opens
  // the item it describes rather than dropping the reader at a list.
  test('a post row opens that post', async ({ page }) => {
    const section = page.getByRole('region', { name: '최신 게시글' })
    // Not .getByRole('link').first() — that is the header's link to the tab.
    await section.getByRole('listitem').first().getByRole('link').click()

    await expect(page).toHaveURL(/\/community\/\d+$/)
    await expect(page.getByRole('button', { name: /목록/ })).toBeVisible()
  })

  test('a reservation row opens that reservation', async ({ page }) => {
    const section = page.getByRole('region', { name: '모집 중인 예약' })
    await section.getByRole('link', { name: /모집중호스트/ }).click()

    await expect(page).toHaveURL(/\/reservation\/1$/)
    const nav = page.getByRole('tablist', { name: 'Main navigation' })
    await expect(nav.getByRole('tab', { name: /^예약/ })).toHaveAttribute('aria-selected', 'true')
  })

  // The rank rows used to offer only the name — 61px of text across a row,
  // with the portraits and the match count beside it describing that same
  // player. A raw coordinate click is the point of this one: whether a pixel
  // out at the row's edge opens anything is a hit test, and the unit suite has
  // no layout engine to answer it.
  test('a top-five row opens the player from anywhere along it', async ({ page }) => {
    const top = page.getByRole('region', { name: '주간 철악귀' }).locator('.rank-row').first()

    // Bottom-left of the row: the position number's column, nowhere near the
    // name. Measured rather than fixed, so it stays inside the row in both the
    // desktop and the wrapped layout whatever height either settles on.
    // Clicked through the row rather than at page coordinates so Playwright
    // scrolls it into view first, and so its hit test still has to pass.
    // The offset is measured rather than fixed — a hard 60px fell outside the
    // row the moment its height changed, and the click then landed on the list
    // behind it and reported a hit-test failure instead of a broken overlay.
    const box = (await top.boundingBox())!
    await top.click({ position: { x: 10, y: box.height - 8 } })

    await expect(page.getByRole('button', { name: '플레이어 기록 닫기' })).toBeVisible()
  })

  // The podium rows decorate themselves, and whatever they use has to stay
  // under the name button's row-wide click overlay. It has not always: a sheen
  // layer painted over the row took this click and the row stopped opening.
  // The far edge is the part a decoration reaches last, so that is where this
  // clicks.
  test('a podium row opens the player from its far edge', async ({ page }) => {
    const medal = page.getByRole('region', { name: '주간 철악귀' }).locator('.rank-row.is-podium').first()
    const box = (await medal.boundingBox())!

    await medal.click({ position: { x: box.width - 20, y: box.height / 2 } })

    await expect(page.getByRole('button', { name: '플레이어 기록 닫기' })).toBeVisible()
  })

  // Deep links are the reason the tabs became routes at all: a shared link has
  // to open on the post itself, cold, with no click path behind it.
  test('a post link opens the post directly', async ({ page }) => {
    await page.goto('/community/1')

    await expect(page.getByRole('button', { name: /목록/ })).toBeVisible()
    const nav = page.getByRole('tablist', { name: 'Main navigation' })
    await expect(nav.getByRole('tab', { name: '커뮤니티' })).toHaveAttribute('aria-selected', 'true')
  })

  test('the back button undoes a row click', async ({ page }) => {
    await page.getByRole('region', { name: '최신 게시글' }).getByRole('listitem').first().getByRole('link').click()
    await expect(page).toHaveURL(/\/community\/\d+$/)

    await page.goBack()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('region', { name: '모집 중인 예약' })).toBeVisible()
  })

  test('a failing source costs only its own card', async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAllApis(page, { failEndpoints: ['history'] })
    await page.goto('/')

    // The history endpoints are down, but rooms still are not: the KPI row and
    // the reservation card have to survive their neighbour failing.
    await expect(page.getByRole('region', { name: '모집 중인 예약' })).toBeVisible()
    await expect(page.getByRole('region', { name: '주간 철악귀' })).toContainText('주간 기록 없음')
  })
})
