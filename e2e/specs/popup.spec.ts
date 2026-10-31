import { test, expect } from '@playwright/test'
import { mockAllApis, signInAs, skipPatchNotes, type ApiPopup } from '../helpers/mock-api'

const popup =(overrides: Partial<ApiPopup> = {}): ApiPopup => ({
  id: 1,
  title: '이벤트 안내',
  body: '이번 주말에 랭크 이벤트가 열립니다',
  image_path: 'popups/1/image?v=e2e',
  allow_dismiss_forever: true,
  allow_dismiss_day: true,
  active: true,
  created_by: 'root',
  created_at: '2026-10-30T00:00:00Z',
  updated_at: '2026-10-30T00:00:00Z',
  ...overrides,
})

test.describe('Site popups', () => {
  test.beforeEach(async ({ page }) => {
    await skipPatchNotes(page)
  })

  test('opens on arrival with its image, and stays shut after 다시 보지 않기', async ({ page }) => {
    await mockAllApis(page, { popups: [popup()] })
    await page.goto('/')

    const dialog = page.getByRole('dialog', { name: '이벤트 안내' })
    await expect(dialog.getByText('이번 주말에 랭크 이벤트가 열립니다')).toBeVisible()
    await expect(dialog.getByRole('img', { name: '이벤트 안내' })).toBeVisible()

    await dialog.getByRole('button', { name: '다시 보지 않기' }).click()
    await expect(dialog).toBeHidden()

    await page.reload()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(dialog).toBeHidden()
  })

  test('stays shut for a day after 하루 동안 보지 않기, and returns after it', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-31T12:00:00+09:00') })
    await mockAllApis(page, { popups: [popup()] })
    await page.goto('/')

    const dialog = page.getByRole('dialog', { name: '이벤트 안내' })
    await dialog.getByRole('button', { name: '하루 동안 보지 않기' }).click()
    await expect(dialog).toBeHidden()

    await page.clock.setSystemTime(new Date('2026-11-01T11:59:00+09:00'))
    await page.reload()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(dialog).toBeHidden()

    await page.clock.setSystemTime(new Date('2026-11-01T12:01:00+09:00'))
    await page.reload()
    await expect(dialog).toBeVisible()
  })

  test('comes back on the next load when only closed', async ({ page }) => {
    await mockAllApis(page, { popups: [popup({ allow_dismiss_forever: false, allow_dismiss_day: false })] })
    await page.goto('/')

    const dialog = page.getByRole('dialog', { name: '이벤트 안내' })
    await expect(dialog.getByRole('button', { name: /보지 않기/ })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()

    await page.reload()
    await expect(dialog).toBeVisible()
  })

  test('waits for the patch notes to close', async ({ page, context }) => {
    await context.addInitScript(() => localStorage.removeItem('ttt2-patch-dismissed'))
    await mockAllApis(page, { popups: [popup()] })
    await page.goto('/')

    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.getByRole('dialog', { name: 'Patch Notes' }).getByRole('button', { name: 'Close' }).click()

    await expect(page.getByRole('dialog', { name: '이벤트 안내' })).toBeVisible()
  })

  test('an admin writes a popup with an image and visitors get it', async ({ page }) => {
    await mockAllApis(page)
    await signInAs(page, 'root', '운영자', true)
    await page.goto('/admin/popups')

    const form = page.getByRole('form', { name: '새 팝업' })
    await form.getByLabel('제목').fill('서버 점검')
    await form.getByLabel(/^내용/).fill('오늘 밤 점검합니다')
    await form.getByLabel(/^이미지/).setInputFiles('public/icon-192.png')
    await expect(form.getByRole('img', { name: '팝업 이미지 미리보기' })).toBeVisible()
    await form.getByLabel('다시 보지 않기 버튼').uncheck()
    await form.getByRole('button', { name: '팝업 만들기' }).click()

    await expect(page.getByRole('list', { name: '만든 팝업' }).getByText('서버 점검')).toBeVisible()
    await expect(page.getByText('팝업을 만들었습니다.')).toBeVisible()
    await expect(form.getByLabel('제목')).toHaveValue('')

    await page.reload()
    const dialog = page.getByRole('dialog', { name: '서버 점검' })
    await expect(dialog.getByText('오늘 밤 점검합니다')).toBeVisible()
    await expect(dialog.getByRole('button', { name: '하루 동안 보지 않기' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: '다시 보지 않기' })).toHaveCount(0)
  })

  test('an admin takes a popup down', async ({ page }) => {
    await mockAllApis(page, { popups: [popup({ allow_dismiss_day: false })] })
    await signInAs(page, 'root', '운영자', true)
    await page.goto('/admin/popups')
    await page.getByRole('dialog', { name: '이벤트 안내' }).getByRole('button', { name: '다시 보지 않기' }).click()

    // The list's long second line must not widen the page on a phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)

    await page.getByRole('button', { name: '이벤트 안내 팝업 삭제' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click()

    await expect(page.getByText('만든 팝업이 없습니다.')).toBeVisible()
  })
})
