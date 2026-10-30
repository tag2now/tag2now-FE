import { test, expect, type Page } from '@playwright/test'
import { mockAllApis, signInAs, skipPatchNotes } from '../helpers/mock-api'

const dialog = (page: Page) => page.getByRole('dialog', { name: '같은 계급 상대 찾기' })

const rows = (page: Page) => dialog(page).getByRole('list', { name: 'Berserker 상대 목록' }).getByRole('listitem')

const holderRequest = (page: Page) =>
  page.waitForRequest((request) => request.url().includes('/api/saves/current-rank-holders'))

const openFinder = (page: Page) => page.getByRole('button', { name: '같은 계급 상대 찾기' }).click()

test.describe('같은 계급 상대 찾기', () => {
  test.beforeEach(async ({ page }) => {
    await skipPatchNotes(page)
    await mockAllApis(page)
  })

  test('a signed-in player opens on their own rank and sees who is in a room first', async ({ page }) => {
    // PLAYER_SAVE plays Paul at 3rd dan and Lei at Berserker (20).
    await signInAs(page, 'np_001', 'TTT2_Master')
    await page.goto('/match/rank_match')
    const asked = holderRequest(page)
    await openFinder(page)
    expect(new URL((await asked).url()).searchParams.get('rank')).toBe('20')

    // u003 sits in a rank-match room; np_001 is the reader, so not listed.
    await expect(rows(page)).toHaveCount(2)
    await expect(rows(page).nth(0)).toContainText('TagComboKing')
    await expect(rows(page).nth(0)).toContainText('방에 있음')
    // np_002 leads the current-rank board in its fixture.
    await expect(rows(page).nth(1)).toContainText('#1')
    await expect(rows(page).nth(1)).toContainText('KingOfIronFist')
    await expect(rows(page).nth(1)).not.toContainText('방에 있음')
  })

  test('a signed-out reader picks a rank before anything is asked, and the dialog fits half the screen', async ({ page }) => {
    let asked = 0
    page.on('request', (request) => { if (request.url().includes('/api/saves/current-rank-holders')) asked += 1 })
    await page.goto('/match/player_match')
    await openFinder(page)
    await expect(dialog(page).getByText('계급을 선택하세요')).toBeVisible()
    expect(asked).toBe(0)

    const request = holderRequest(page)
    await dialog(page).getByRole('button', { name: '계급: 계급 선택' }).click()
    await dialog(page).getByRole('button', { name: 'Mentor' }).click()
    expect(new URL((await request).url()).searchParams.get('rank')).toBe('14')
    await expect(rows(page)).toHaveCount(3)

    const height = (await dialog(page).boundingBox())!.height
    expect(height).toBeLessThanOrEqual(page.viewportSize()!.height / 2 + 1)

    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
  })
})
