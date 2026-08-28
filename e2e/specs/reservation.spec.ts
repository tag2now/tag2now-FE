import { test, expect, type Locator } from '@playwright/test'
import { dismissPatchNotes, mockAllApis, reservationAt, signInAs } from '../helpers/mock-api'

test.describe('Reservation', () => {
  test.beforeEach(async ({ page }) => {
    // The default start time is the next whole hour in Seoul, so pin the clock
    // to 20:10 KST and the form opens on a predictable 21:00.
    await page.clock.install({ time: new Date('2026-08-28T11:10:00Z') })
    await page.clock.runFor(0)
    await signInAs(page, '나')
    await mockAllApis(page)
    await page.addInitScript(() => localStorage.setItem('ttt2-username', '나'))
    await page.goto('/')
    await dismissPatchNotes(page)
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
    await expect(timeButton).toHaveAttribute('aria-label', '시작 시각 22:00')

    await modal.getByRole('button', { name: /계급 선택, 현재/ }).click()
    const rankPicker = page.locator('#reservation-rank-picker')
    await expect(rankPicker.locator('button[aria-pressed]')).toHaveCount(36)
    await rankPicker.getByRole('button', { name: /Yaksa/ }).click()
    await rankPicker.getByRole('button', { name: '선택 완료' }).click()
    await expect(modal.getByRole('button', { name: '계급 선택, 현재 Yaksa, Vanquisher' })).toBeVisible()

    await modal.getByRole('button', { name: '예약 등록' }).click()
    const createdCard = page.getByRole('button', { name: /나 모집중 Yaksa, Vanquisher/ })
    await expect(createdCard).toBeVisible()
    await expect(createdCard.getByRole('img', { name: 'Yaksa' })).toBeVisible()
    await expect(createdCard.getByText('+1')).toBeVisible()
  })

  test('surfaces a list-refresh failure inside the modal while it is open', async ({ page }) => {
    await page.route('**/api/reservations?**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: '예약을 불러오지 못했습니다.' }),
      })
    })
    await page.reload()
    await dismissPatchNotes(page)
    await page.getByRole('tab', { name: '예약' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toHaveText('예약을 불러오지 못했습니다.')
    expect(await isTopmost(alert)).toBe(true)

    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const modal = page.getByRole('dialog', { name: '예약 추가' })
    await expect(modal.getByRole('alert')).toBeVisible()
    expect(await isTopmost(modal.getByRole('alert'))).toBe(true)
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
    await modal.getByRole('button', { name: '예약 등록' }).click()

    // The modal stays open, so the banner has to live inside it.
    await expect(modal).toBeVisible()
    const alert = page.getByRole('alert')
    await expect(alert).toHaveText('이미 같은 시간에 예약이 있습니다.')
    await expect(alert).toBeInViewport()
    expect(await isTopmost(alert)).toBe(true)
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
    await signInAs(page, '나')
    await mockAllApis(page, { reservations })
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.getByRole('tab', { name: '예약' }).click()
  }

  // The owner token only exists for a reservation this browser created, so the
  // delete affordance has to be earned by going through the create flow.
  async function createReservation(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    const modal = page.getByRole('dialog', { name: '예약 추가' })
    await modal.getByRole('button', { name: '예약 등록' }).click()
    await page.getByRole('button', { name: /나 모집중/ }).click()
    return page.getByRole('complementary', { name: '선택한 예약 상세' })
  }

  test('the host can delete a reservation they created', async ({ page }) => {
    await openReservationTab(page, [])
    const detail = await createReservation(page)

    page.once('dialog', (dialog) => dialog.accept())
    const deleteRequest = page.waitForRequest((request) =>
      request.method() === 'DELETE' && /\/reservations\/\d+$/.test(new URL(request.url()).pathname))
    await detail.getByRole('button', { name: '예약 삭제' }).click()

    // The owner token proves the request is authorised; without it the backend
    // rejects the delete, so a passing UI assertion alone would not mean much.
    expect((await deleteRequest).headers()['x-reservation-token']).toBeTruthy()
    await expect(page.getByRole('button', { name: /나 모집중/ })).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveText('예약을 삭제했습니다.')
  })

  test('dismissing the confirmation keeps the reservation', async ({ page }) => {
    await openReservationTab(page, [])
    const detail = await createReservation(page)

    page.once('dialog', (dialog) => dialog.dismiss())
    await detail.getByRole('button', { name: '예약 삭제' }).click()

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
    await signInAs(page, '나')
    await mockAllApis(page, { reservations })
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.getByRole('tab', { name: '예약' }).click()
  }

  async function createThenOpenEditor(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: '+ 예약 추가' }).click()
    await page.getByRole('dialog', { name: '예약 추가' }).getByRole('button', { name: '예약 등록' }).click()
    await page.getByRole('button', { name: /나 모집중/ }).click()
    const detail = page.getByRole('complementary', { name: '선택한 예약 상세' })
    await detail.getByRole('button', { name: '예약 수정' }).click()
    return page.getByRole('dialog', { name: '예약 수정' })
  }

  test('the host edits a reservation through the create form', async ({ page }) => {
    await openReservationTab(page, [])
    const modal = await createThenOpenEditor(page)

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
    const modal = await createThenOpenEditor(page)

    await expect(modal.getByLabel('예상 시간')).toHaveValue('60')
    await expect(modal.getByRole('button', { name: /시작 시각/ })).toBeVisible()
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
    await dismissPatchNotes(page)
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
    const modal = await createThenOpenEditor(page)

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
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.getByRole('tab', { name: '예약' }).click()
    await page.getByRole('button', { name: /상대/ }).click()
    return page.getByRole('complementary', { name: '선택한 예약 상세' })
  }

  test('joining a rank match settles it and offers to cancel', async ({ page }) => {
    const detail = await openReservationTab(page)

    await detail.getByRole('button', { name: '참가하기' }).click()

    await expect(page.getByRole('status')).toHaveText(/매칭이 성사되었습니다/)
    await expect(detail.getByRole('button', { name: '참가 취소' })).toBeVisible()
    await expect(page.getByRole('button', { name: /상대 마감/ })).toBeVisible()
  })

  test('cancelling a participation puts the reservation back up for grabs', async ({ page }) => {
    const detail = await openReservationTab(page)
    await detail.getByRole('button', { name: '참가하기' }).click()
    await expect(detail.getByRole('button', { name: '참가 취소' })).toBeVisible()

    await detail.getByRole('button', { name: '참가 취소' }).click()

    await expect(page.getByRole('status')).toHaveText(/다시 모집중으로 전환되었습니다/)
    await expect(detail.getByRole('button', { name: '참가하기' })).toBeVisible()
    await expect(page.getByRole('button', { name: /상대 모집중/ })).toBeVisible()
  })

  test('a player match stays open until every slot is taken', async ({ page }) => {
    const detail = await openReservationTab(page, [
      reservationAt(21, { id: 10, match_type: 'player_match', capacity: 2, host_ranks: [] }),
    ])

    await detail.getByRole('button', { name: '참가하기' }).click()

    await expect(page.getByRole('status')).toHaveText(/다른 참가자를 기다리고 있어요/)
    await expect(page.getByRole('button', { name: /상대 1\/2명/ })).toBeVisible()
  })

  test('a reservation someone else filled cannot be joined', async ({ page }) => {
    const detail = await openReservationTab(page, [
      reservationAt(21, { id: 10, status: 'matched', participant_count: 1 }),
    ])

    await expect(detail.getByRole('button', { name: '모집 마감' })).toBeDisabled()
  })

  test('the participation survives a reload', async ({ page }) => {
    const detail = await openReservationTab(page)
    await detail.getByRole('button', { name: '참가하기' }).click()
    await expect(detail.getByRole('button', { name: '참가 취소' })).toBeVisible()

    await page.reload()
    await dismissPatchNotes(page)
    await page.getByRole('tab', { name: '예약' }).click()
    await page.getByRole('button', { name: /상대/ }).click()

    await expect(page.getByRole('complementary', { name: '선택한 예약 상세' })
      .getByRole('button', { name: '참가 취소' })).toBeVisible()
  })
})
