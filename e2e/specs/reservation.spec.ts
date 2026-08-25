import { test, expect, type Locator } from '@playwright/test'
import { dismissPatchNotes, mockAllApis } from '../helpers/mock-api'

test.describe('Reservation', () => {
  test.beforeEach(async ({ page }) => {
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
