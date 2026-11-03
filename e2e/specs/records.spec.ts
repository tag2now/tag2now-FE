import { test, expect, type Page } from '@playwright/test'
import { mockAllApis, skipPatchNotes } from '../helpers/mock-api'

const rows = (page: Page) => page.getByRole('list', { name: '전체 전적' }).getByRole('listitem')
const profileTab = (page: Page, name: string) =>
  page.getByRole('tablist', { name: '플레이어 정보' }).getByRole('tab', { name })

test.describe('Records', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await skipPatchNotes(page)
  })

  test('the 전적 tab lists matches with each character and its rank, a page at a time', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tablist', { name: 'Main navigation' }).getByRole('tab', { name: '전적' }).click()
    await expect(page).toHaveURL(/\/records$/)

    await expect(rows(page)).toHaveCount(6)
    const first = rows(page).first()
    await expect(first.getByRole('button')).toHaveText(['TTT2_Master', 'KingOfIronFist'])
    await expect(first.getByRole('img', { name: 'Yaksa' })).toBeVisible()
    await expect(first.getByRole('img', { name: 'Vanquisher' })).toBeVisible()

    await page.getByRole('button', { name: '더 보기' }).click()
    await expect(rows(page)).toHaveCount(10)
    await expect(page.getByRole('button', { name: '더 보기' })).toHaveCount(0)
  })

  test('says what is unknown rather than leaving a gap', async ({ page }) => {
    await page.goto('/records')
    await expect(rows(page).nth(3)).toContainText('캐릭터 미확인')
    await expect(rows(page).nth(4)).toContainText('상대 미확인')
    // No room, so no name either: the id stands in.
    await expect(rows(page).nth(4)).toContainText('np_005')
  })

  test('searches by name and says when nothing matches', async ({ page }) => {
    await page.goto('/records')
    await expect(rows(page)).toHaveCount(6)

    await page.getByLabel('플레이어 검색').fill('bear')
    await expect(rows(page)).toHaveCount(3)
    for (const row of await rows(page).all()) await expect(row).toContainText('BearPunchPro')

    await page.getByLabel('플레이어 검색').fill('nobody')
    await expect(page.getByText("'nobody'의 전적이 없습니다")).toBeVisible()
  })

  test('a name opens the profile on its records, and an opponent there opens in place', async ({ page }) => {
    await page.goto('/records')
    await rows(page).first().getByRole('button', { name: 'TTT2_Master 기록 보기' }).click()

    await profileTab(page, '전적').click()
    const records = page.getByRole('region', { name: '전적' })
    await expect(records).toContainText('5판 2승 3패')
    await expect(records.getByRole('listitem').first().locator('.record-result')).toHaveText('승')

    await records.getByRole('button', { name: 'KingOfIronFist 기록 보기' }).first().click()
    await expect(page.getByRole('heading', { name: 'np_002' })).toBeVisible()
    await expect(profileTab(page, '전적')).toHaveAttribute('aria-selected', 'true')
    await expect(records).toContainText('4판 3승 1패')

    await page.getByRole('button', { name: 'np_001' }).click()
    await expect(page.getByRole('heading', { name: 'np_001' })).toBeVisible()
  })

  // The profile is one component on every screen; the leaderboard is another way in.
  test('the profile opened from the leaderboard has the records tab too', async ({ page }) => {
    await page.goto('/leaderboard')
    await page.locator('.rank-row button.player-btn').first().click()

    await expect(page.getByRole('tablist', { name: '플레이어 정보' }).getByRole('tab')).toHaveText(['플레이 기록', '전적', '캐릭터별 계급'])
    await profileTab(page, '전적').click()
    await expect(page.getByRole('region', { name: '전적' }).getByRole('listitem').first()).toBeVisible()
  })
})

test('a failed list offers a retry and keeps the search', async ({ page }) => {
  await mockAllApis(page, { failEndpoints: ['matchRecords'] })
  await skipPatchNotes(page)
  await page.goto('/records')

  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible()
  await expect(page.getByLabel('플레이어 검색')).toBeVisible()
})
