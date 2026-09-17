import { test, expect, type Locator } from '@playwright/test'
import { mockAllApis, reservationAt, signInAs, skipPatchNotes } from '../helpers/mock-api'

/** Nothing is preselected, so a rank match stays unsubmittable until a rank is
 * picked — every flow that posts one goes through here. */
async function pickRank(modal: Locator, rank = 'Vanquisher') {
  await modal.getByRole('button', { name: /계급 선택/ }).click()
  const picker = modal.page().locator('#reservation-rank-picker')
  await picker.getByRole('button', { name: new RegExp(rank) }).click()
  await picker.getByRole('button', { name: '선택 완료' }).click()
}

/** Phones show the detail in place of the list, so a card check made after
 * acting on the detail has to step back to the list first. */
async function showList(page: import('@playwright/test').Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: '목록으로' }).click()
}

test.describe('Reservation', () => {
  test.beforeEach(async ({ page }) => {
    // The default start time follows the clock, so pin it to 20:10 KST and the
    // form opens on a predictable 21:00 today.
    await page.clock.install({ time: new Date('2026-08-28T11:10:00Z') })
    await page.clock.runFor(0)
    await signInAs(page, '나')
    await mockAllApis(page)
    await page.addInitScript(() => localStorage.setItem('ttt2-username', '나'))
    await skipPatchNotes(page)
    await page.goto('/')
    await page.getByRole('tab', { name: '예약' }).click()
  })

  test('creates a rank reservation with wheel time and multiple ranks', async ({ page }) => {
    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const modal = page.getByRole('dialog', { name: '예약 추가' })
    await expect(modal).toBeVisible()

    const timeButton = modal.getByRole('button', { name: /시작 시각/ })
    await timeButton.click()
    const wheels = page.locator('[data-rwp]')
    await expect(wheels).toHaveCount(2)
    await wheels.first().focus()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(500)
    await page.getByRole('dialog', { name: '시간 선택' }).getByRole('button', { name: '선택 완료' }).click()
    await expect(timeButton).toHaveAttribute('aria-label', '시작 시각 오늘 22:00')

    await modal.getByRole('button', { name: '계급 선택' }).click()
    const rankPicker = page.locator('#reservation-rank-picker')
    // All 43 TTT2 ranks, Beginner through True Tekken God.
    await expect(rankPicker.locator('button[aria-pressed]')).toHaveCount(43)
    await rankPicker.getByRole('button', { name: /Yaksa/ }).click()
    await rankPicker.getByRole('button', { name: /Vanquisher/ }).click()
    await rankPicker.getByRole('button', { name: '선택 완료' }).click()
    await expect(modal.getByRole('button', { name: '계급 선택, 현재 Yaksa, Vanquisher' })).toBeVisible()

    await modal.getByRole('button', { name: '예약 등록' }).click()
    const createdCard = page.getByRole('button', { name: /나 모집중 Yaksa, Vanquisher/ })
    await expect(createdCard).toBeVisible()
    await expect(createdCard.getByRole('img', { name: 'Yaksa' })).toBeVisible()
    await expect(createdCard.getByRole('img', { name: 'Vanquisher' })).toBeVisible()
  })

  // With many reservations the stacked detail sat below every card, so phones
  // show the list and the detail one at a time, keyed by the path.
  test('phones open a reservation as its own page and return to the list', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Desktop shows the list and the detail side by side.')
    await mockAllApis(page, {
      reservations: [reservationAt(21, { id: 7, host_display_name: '온프' }), reservationAt(22, { id: 8, host_display_name: '둘째' })],
    })
    await page.goto('/reservation')
    const detail = page.getByRole('complementary', { name: '선택한 예약 상세' })
    const card = page.getByRole('button', { name: /온프/ })
    await expect(card).toBeVisible()
    await expect(detail).toBeHidden()

    await card.click()
    await expect(page).toHaveURL(/\/reservation\/7$/)
    await expect(detail).toBeVisible()
    await expect(card).toBeHidden()

    await detail.getByRole('button', { name: '목록으로' }).click()
    await expect(page).toHaveURL(/\/reservation$/)
    await expect(card).toBeVisible()
    await expect(detail).toBeHidden()
  })

  /** `toBeVisible` is not enough here: it asks whether the element has a box and
   * is not hidden, and an element clipped away by an ancestor's `overflow: hidden`
   * passes that while being invisible on screen. The badge used to sit outside the
   * card, and the suite stayed green. Compare the boxes instead. */
  test('keeps the overflow badge inside the card that clips it', async ({ page }) => {
    await mockAllApis(page, {
      reservations: [reservationAt(21, { id: 7, host_display_name: '온프', host_ranks: ['Yaksa', 'Fujin', 'Warrior', 'Vanquisher', 'Mentor'] })],
    })
    await page.reload()
    await page.getByRole('tab', { name: '예약' }).click()

    const card = page.getByRole('button', { name: /온프/ })
    const badge = card.getByText('+2')
    await expect(badge).toBeVisible()

    const cardBox = (await card.boundingBox())!
    const badgeBox = (await badge.boundingBox())!
    expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width)
    expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height)

    // The card counts what it cannot fit; the detail panel is where they all are.
    await card.click()
    const detail = page.getByRole('complementary', { name: '선택한 예약 상세' })
    await expect(detail.locator('img[alt="Mentor"]')).toBeVisible()
    await expect(detail.getByText('+2')).toHaveCount(0)
  })

  test('reports a failed list load in the list, with the panel chrome intact', async ({ page }) => {
    await page.route('**/api/reservations?**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: '예약을 불러오지 못했습니다.' }),
      })
    })
    await page.reload()
    await page.getByRole('tab', { name: '예약' }).click()

    // A failed list load is a state of the list, not of the whole tab: the
    // reason and a retry sit where the reservations would have been, and it
    // offers a way out rather than only reporting the failure.
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('예약을 불러오지 못했습니다.')
    await expect(alert.getByRole('button', { name: '다시 시도' })).toBeVisible()
    expect(await isTopmost(alert)).toBe(true)

    // The chrome around the data never waited on the response, so posting a
    // reservation is still reachable while the list is broken.
    await expect(page.getByRole('button', { name: '+ 예약 추가' })).toBeVisible()
    await expect(page.getByRole('group', { name: '매치 종류 필터' })).toBeVisible()
  })

  test('shows the failure reason on top of the modal, not hidden behind it', async ({ page }) => {
    // Intercept the write so nothing reaches the real backend.
    await page.route('**/api/reservations', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: '이미 같은 시간에 예약이 있습니다.' }),
      })
    })

    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const modal = page.getByRole('dialog', { name: '예약 추가' })
    await pickRank(modal)
    await modal.getByRole('button', { name: '예약 등록' }).click()

    // The modal stays open, so the banner has to live inside it.
    await expect(modal).toBeVisible()
    const alert = page.getByRole('alert')
    await expect(alert).toHaveText('이미 같은 시간에 예약이 있습니다.')
    await expect(alert).toBeInViewport()
    expect(await isTopmost(alert)).toBe(true)
  })

  test('creates a reservation open to either match type, keeping ranks and capacity', async ({ page }) => {
    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const modal = page.getByRole('dialog', { name: '예약 추가' })
    await modal.getByRole('radio', { name: '상관없음' }).click()

    await expect(modal.getByRole('group', { name: /보유 계급/ })).toBeVisible()
    await modal.getByLabel('모집 인원').selectOption('2')
    await modal.getByRole('button', { name: '예약 등록' }).click()

    await expect(page.getByRole('button', { name: /나 0\/2명/ })).toBeVisible()
  })

  test('creates a player match without rank selection', async ({ page }) => {
    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const modal = page.getByRole('dialog', { name: '예약 추가' })
    await modal.getByRole('radio', { name: '플레이어 매치' }).click()

    await expect(modal.getByRole('group', { name: /보유 계급/ })).toHaveCount(0)
    await modal.getByLabel('모집 인원').selectOption('3')
    await modal.getByRole('button', { name: '예약 등록' }).click()

    await expect(page.getByRole('button', { name: /나 0\/3명 PLAYER MATCH/ })).toBeVisible()
  })
})

/**
 * toBeVisible() passes for an element covered by an overlay — it only looks at
 * CSS box and visibility. Hit-test the centre point to prove the element is
 * what the user actually sees there.
 */
async function isTopmost(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return hit !== null && element.contains(hit)
  })
}

test.describe('Reservation deletion', () => {
  const someoneElse = reservationAt(21, { id: 10, host_display_name: '상대', host_ranks: ['Yaksa'] })

  async function openReservationTab(page: import('@playwright/test').Page, reservations = [someoneElse]) {
    // The form refuses a start outside the booking window, so on the real clock
    // these would fail in the ten minutes before 06:00 KST. 20:10 KST, as above.
    await page.clock.install({ time: new Date('2026-08-28T11:10:00Z') })
    await page.clock.runFor(0)
    await signInAs(page, '나')
    await mockAllApis(page, { reservations })
    await skipPatchNotes(page)
    await page.goto('/')
    await page.getByRole('tab', { name: '예약' }).click()
  }

  // The owner token only exists for a reservation this browser created, so the
  // delete affordance has to be earned by going through the create flow.
  async function createReservation(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const modal = page.getByRole('dialog', { name: '예약 추가' })
    await pickRank(modal)
    await modal.getByRole('button', { name: '예약 등록' }).click()
    await page.getByRole('button', { name: /나 모집중/ }).click()
    return page.getByRole('complementary', { name: '선택한 예약 상세' })
  }

  test('the host can delete a reservation they created', async ({ page }) => {
    await openReservationTab(page, [])
    const detail = await createReservation(page)

    const deleteRequest = page.waitForRequest((request) =>
      request.method() === 'DELETE' && /\/reservations\/\d+$/.test(new URL(request.url()).pathname))
    await detail.getByRole('button', { name: '예약 삭제' }).click()
    // The app's own confirmation, not window.confirm — so it is a node in the
    // page and `page.on('dialog')` would wait forever for a browser dialog.
    await page.getByRole('alertdialog', { name: '예약을 삭제할까요?' })
      .getByRole('button', { name: '삭제' }).click()

    // The owner token proves the request is authorised; without it the backend
    // rejects the delete, so a passing UI assertion alone would not mean much.
    expect((await deleteRequest).headers()['x-reservation-token']).toBeTruthy()
    await expect(page.getByRole('button', { name: /나 모집중/ })).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveText('예약을 삭제했습니다.')
  })

  test('dismissing the confirmation keeps the reservation', async ({ page, isMobile }) => {
    await openReservationTab(page, [])
    const detail = await createReservation(page)

    await detail.getByRole('button', { name: '예약 삭제' }).click()
    await page.getByRole('alertdialog', { name: '예약을 삭제할까요?' })
      .getByRole('button', { name: '취소' }).click()

    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await showList(page, isMobile)
    await expect(page.getByRole('button', { name: /나 모집중/ })).toBeVisible()
  })

  test('a reservation hosted by someone else offers joining, not deleting', async ({ page }) => {
    await openReservationTab(page)
    await page.getByRole('button', { name: /상대/ }).click()
    const detail = page.getByRole('complementary', { name: '선택한 예약 상세' })

    await expect(detail.getByRole('button', { name: '참가하기' })).toBeVisible()
    await expect(detail.getByRole('button', { name: '예약 삭제' })).toHaveCount(0)
  })
})

test.describe('Reservation editing', () => {
  const someoneElse = reservationAt(21, { id: 10, host_display_name: '상대', host_ranks: ['Yaksa'] })

  async function openReservationTab(page: import('@playwright/test').Page, reservations = [someoneElse]) {
    // Pinned for the same reason as the deletion specs: the form checks the
    // start against the clock, and the real one reaches 05:50 KST once a day.
    await page.clock.install({ time: new Date('2026-08-28T11:10:00Z') })
    await page.clock.runFor(0)
    await signInAs(page, '나')
    await mockAllApis(page, { reservations })
    await skipPatchNotes(page)
    await page.goto('/')
    await page.getByRole('tab', { name: '예약' }).click()
  }

  async function createThenOpenEditor(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const modal = page.getByRole('dialog', { name: '예약 추가' })
    await pickRank(modal)
    // What the editor owes us is the time the form posted — carry it out
    // rather than restating the default here.
    const postedTime = await modal.getByRole('button', { name: /시작 시각/ }).getAttribute('aria-label')
    await modal.getByRole('button', { name: '예약 등록' }).click()
    await page.getByRole('button', { name: /나 모집중/ }).click()
    const detail = page.getByRole('complementary', { name: '선택한 예약 상세' })
    await detail.getByRole('button', { name: '예약 수정' }).click()
    return { modal: page.getByRole('dialog', { name: '예약 수정' }), postedTime }
  }

  test('the host edits a reservation through the create form', async ({ page }) => {
    await openReservationTab(page, [])
    const { modal } = await createThenOpenEditor(page)

    await modal.getByLabel(/메모/).fill('자리 하나 남음')
    const editRequest = page.waitForRequest((request) => request.method() === 'PATCH')
    await modal.getByRole('button', { name: '예약 수정' }).click()

    // The owner token authorises the edit; without it the backend refuses.
    expect((await editRequest).headers()['x-reservation-token']).toBeTruthy()
    await expect(page.getByRole('status')).toHaveText('예약을 수정했습니다.')
    await expect(page.getByText('자리 하나 남음')).toBeVisible()
  })

  test('the editor opens on the values the reservation already has', async ({ page }) => {
    await openReservationTab(page, [])
    const { modal, postedTime } = await createThenOpenEditor(page)

    await expect(modal.getByRole('button', { name: /시작 시각/ })).toHaveAttribute('aria-label', postedTime!)
    await expect(modal.getByRole('button', { name: '계급 선택, 현재 Vanquisher' })).toBeVisible()
  })

  test('a reservation hosted by someone else offers no edit button', async ({ page }) => {
    await openReservationTab(page)
    await page.getByRole('button', { name: /상대/ }).click()
    const detail = page.getByRole('complementary', { name: '선택한 예약 상세' })

    await expect(detail.getByRole('button', { name: '예약 수정' })).toHaveCount(0)
  })

  test('the edit button is disabled once somebody has joined', async ({ page }) => {
    const taken = reservationAt(21, { id: 11, host_display_name: '나', capacity: 3, participant_count: 1 })
    await openReservationTab(page, [taken])
    await page.evaluate(() => localStorage.setItem('reservation-owner-11', 'owner-11'))
    await page.reload()
    await page.getByRole('tab', { name: '예약' }).click()
    await page.getByRole('button', { name: /나 모집중/ }).click()
    const detail = page.getByRole('complementary', { name: '선택한 예약 상세' })

    await expect(detail.getByRole('button', { name: '예약 수정' })).toBeDisabled()
    await expect(detail.getByRole('button', { name: '예약 삭제' })).toBeEnabled()
  })

  // The disabled button covers the state the host can see; this covers the race
  // it cannot — somebody joining while the editor is already open.
  test('the backend reason shows when a joined reservation is edited', async ({ page }) => {
    await openReservationTab(page, [])
    const { modal } = await createThenOpenEditor(page)

    // Somebody joins between opening the editor and submitting it.
    await page.evaluate(() => fetch('/api/reservations/1/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: '난입', ranks: [] }),
    }))
    await modal.getByRole('button', { name: '예약 수정' }).click()

    await expect(page.getByRole('alert')).toContainText('참가자가 있는 예약')
  })
})

test.describe('Reservation participation', () => {
  const openRankMatch = reservationAt(21, { id: 10, host_display_name: '상대', host_ranks: ['Yaksa'] })

  async function openReservationTab(page: import('@playwright/test').Page, reservations = [openRankMatch]) {
    await signInAs(page, '나')
    await mockAllApis(page, { reservations })
    await skipPatchNotes(page)
    await page.goto('/')
    await page.getByRole('tab', { name: '예약' }).click()
    await page.getByRole('button', { name: /상대/ }).click()
    return page.getByRole('complementary', { name: '선택한 예약 상세' })
  }

  test('joining a rank match settles it and offers to cancel', async ({ page, isMobile }) => {
    const detail = await openReservationTab(page)

    await detail.getByRole('button', { name: '참가하기' }).click()

    await expect(page.getByRole('status')).toHaveText(/매칭이 성사되었습니다/)
    await expect(detail.getByRole('button', { name: '참가 취소' })).toBeVisible()
    await showList(page, isMobile)
    await expect(page.getByRole('button', { name: /상대 모집 완료/ })).toBeVisible()
  })

  test('cancelling a participation puts the reservation back up for grabs', async ({ page, isMobile }) => {
    const detail = await openReservationTab(page)
    await detail.getByRole('button', { name: '참가하기' }).click()
    await expect(detail.getByRole('button', { name: '참가 취소' })).toBeVisible()

    await detail.getByRole('button', { name: '참가 취소' }).click()

    await expect(page.getByRole('status')).toHaveText(/다시 모집중으로 전환되었습니다/)
    await expect(detail.getByRole('button', { name: '참가하기' })).toBeVisible()
    await showList(page, isMobile)
    await expect(page.getByRole('button', { name: /상대 모집중/ })).toBeVisible()
  })

  test('a player match stays open until every slot is taken', async ({ page, isMobile }) => {
    const detail = await openReservationTab(page, [
      reservationAt(21, { id: 10, match_type: 'player_match', capacity: 2, host_ranks: [] }),
    ])

    await detail.getByRole('button', { name: '참가하기' }).click()

    await expect(page.getByRole('status')).toHaveText(/다른 참가자를 기다리고 있어요/)
    await showList(page, isMobile)
    await expect(page.getByRole('button', { name: /상대 1\/2명/ })).toBeVisible()
  })

  test('a reservation someone else filled cannot be joined', async ({ page }) => {
    const detail = await openReservationTab(page, [
      reservationAt(21, { id: 10, status: 'matched', participant_count: 1 }),
    ])

    await expect(detail.getByRole('button', { name: '모집 완료' })).toBeDisabled()
  })

  test('the participation survives a reload', async ({ page }) => {
    const detail = await openReservationTab(page)
    await detail.getByRole('button', { name: '참가하기' }).click()
    await expect(detail.getByRole('button', { name: '참가 취소' })).toBeVisible()

    await page.reload()
    await page.getByRole('tab', { name: '예약' }).click()
    await page.getByRole('button', { name: /상대/ }).click()

    await expect(page.getByRole('complementary', { name: '선택한 예약 상세' })
      .getByRole('button', { name: '참가 취소' })).toBeVisible()
  })
})
