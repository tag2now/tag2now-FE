import { test, expect } from '@playwright/test'
import { mockAllApis, signInAs, skipPatchNotes } from '../helpers/mock-api'

test.describe('Account management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await skipPatchNotes(page)
  })

  test('an admin reaches it from the account menu, looks an account up and bans it', async ({ page }) => {
    await signInAs(page, 'root', '운영자', true)
    await page.goto('/')

    const header = page.locator('#headerProfileSlot')
    await header.getByRole('button', { name: '운영자 계정 메뉴' }).click()
    await header.getByRole('menuitem', { name: '계정 관리' }).click()

    await expect(page).toHaveURL(/\/admin$/)
    // The page has no nav tab, so none is selected.
    await expect(page.getByRole('tablist', { name: 'Main navigation' }).getByRole('tab', { selected: true })).toHaveCount(0)

    await page.getByLabel('대상 RPCN 아이디').fill('Cheater')
    await page.getByLabel('내 비밀번호 (확인용)').fill('pw')
    await page.getByRole('button', { name: '조회' }).click()

    const account = page.getByRole('region', { name: '조회한 계정' })
    await expect(account.getByText('Cheater-online')).toBeVisible()
    await expect(account.getByText('접속 중')).toBeVisible()

    await account.getByRole('button', { name: '밴' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: '밴' }).click()

    await expect(account.getByText('밴됨')).toBeVisible()
    await expect(page.getByText('Cheater 계정을 밴하고 접속을 끊었습니다.')).toBeVisible()
    await expect(account.getByRole('button', { name: '밴' })).toBeDisabled()
  })

  test('a wrong admin password is reported without signing the admin out', async ({ page }) => {
    await signInAs(page, 'root', '운영자', true)
    await page.goto('/admin')

    await page.getByLabel('대상 RPCN 아이디').fill('Cheater')
    await page.getByLabel('내 비밀번호 (확인용)').fill('wrong')
    await page.getByRole('button', { name: '조회' }).click()

    await expect(page.getByRole('alert')).toHaveText('비밀번호가 올바르지 않습니다.')
    await expect(page.locator('#headerProfileSlot').getByRole('button', { name: '운영자 계정 메뉴' })).toBeVisible()
  })

  test('a non-admin who opens the address sees no form', async ({ page }) => {
    await signInAs(page, 'player')
    await page.goto('/admin')

    await expect(page.getByText('관리자 권한이 없습니다.')).toBeVisible()
    await expect(page.getByLabel('대상 RPCN 아이디')).toHaveCount(0)
  })
})
