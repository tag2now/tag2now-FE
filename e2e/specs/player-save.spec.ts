import { test, expect } from '@playwright/test'
import { mockAllApis, PLAYER_SAVE, skipPatchNotes } from '../helpers/mock-api'

// Every profile has a 캐릭터별 계급 tab beside the play history: the player's
// TTT2 save, read-only.
test.describe('Save ranks on a profile', () => {
  test.beforeEach(async ({ page }) => {
    // KingOfIronFist (np_002), a partner the history fixture offers, never saved TTT2.
    await mockAllApis(page, { playerSave: { np_002: null } })
    await skipPatchNotes(page)
    await page.goto('/')
  })

  test("the save tab shows the player's ranks, highest first, and a partner without a save says so", async ({ page }) => {
    await page.getByRole('region', { name: '주간 철악귀' }).getByRole('button', { name: 'TTT2_Master' }).click()
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: '플레이어 기록 닫기' }) })
    const historyTab = dialog.getByRole('tab', { name: '플레이 기록' })
    const saveTab = dialog.getByRole('tab', { name: '캐릭터별 계급' })

    // The play history is what opens.
    await expect(historyTab).toHaveAttribute('aria-selected', 'true')
    await expect(dialog.getByRole('heading', { name: '자주 함께한 플레이어' })).toBeVisible()

    await saveTab.click()
    const save = dialog.getByRole('region', { name: '캐릭터별 계급' })
    await expect(save.getByText('15판 10승 5패')).toBeVisible()
    // Lei (Berserker) above Paul (3rd dan); King, never played, is left out.
    const rows = save.getByRole('row')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(1).getByRole('img', { name: 'Lei' })).toBeVisible()
    await expect(rows.nth(1).getByRole('img', { name: 'Berserker' })).toBeVisible()
    await expect(rows.nth(2).getByRole('img', { name: 'Paul' })).toBeVisible()
    // The period is the play history's alone.
    await expect(dialog.getByRole('group', { name: '조회 기간' })).toHaveCount(0)

    await historyTab.click()
    await dialog.getByRole('button', { name: 'KingOfIronFist 기록 보기' }).click()
    await saveTab.click()
    await expect(save.getByText('캐릭터 계급 정보가 없습니다.')).toBeVisible()
  })

  test('keeps the popup height across long and empty saves, scrolling the character list inside it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/api/saves/players/np_001*', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...PLAYER_SAVE,
        chars: Array.from({ length: 59 }, (_, id) => ({ ...PLAYER_SAVE.chars[0], id })),
      }),
    }))
    await page.getByRole('region', { name: '주간 철악귀' }).getByRole('button', { name: 'TTT2_Master' }).click()
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: '플레이어 기록 닫기' }) })
    const historyTab = dialog.getByRole('tab', { name: '플레이 기록' })
    const saveTab = dialog.getByRole('tab', { name: '캐릭터별 계급' })
    await expect(dialog.getByRole('heading', { name: '자주 함께한 플레이어' })).toBeVisible()
    const original = (await dialog.boundingBox())!

    await saveTab.click()
    const rows = dialog.getByRole('region', { name: '캐릭터별 계급' }).getByRole('row')
    await expect(rows).toHaveCount(60)
    const withSave = (await dialog.boundingBox())!
    expect(withSave.height).toBeCloseTo(original.height, 1)
    expect(withSave.y).toBeCloseTo(original.y, 1)

    const body = dialog.locator('.history-body')
    expect(await body.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
    await rows.last().scrollIntoViewIfNeeded()
    expect(await body.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
    await expect(dialog.getByRole('button', { name: '플레이어 기록 닫기' })).toBeInViewport()
    expect((await dialog.boundingBox())!.height).toBeCloseTo(original.height, 1)

    await historyTab.click()
    await dialog.getByRole('button', { name: 'KingOfIronFist 기록 보기' }).click()
    await saveTab.click()
    await expect(dialog.getByText('캐릭터 계급 정보가 없습니다.')).toBeVisible()
    expect((await dialog.boundingBox())!.height).toBeCloseTo(original.height, 1)

    await page.setViewportSize({ width: 844, height: 360 })
    const shortScreen = (await dialog.boundingBox())!
    expect(shortScreen.y).toBeGreaterThanOrEqual(16)
    expect(shortScreen.y + shortScreen.height).toBeLessThanOrEqual(360 - 16)
    await expect(dialog.getByRole('button', { name: '플레이어 기록 닫기' })).toBeInViewport()
  })
})
