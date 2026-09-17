import { test, expect } from '@playwright/test'
import { mockAllApis, skipPatchNotes } from '../helpers/mock-api'

test.describe('Community', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await skipPatchNotes(page)
    await page.goto('/')
    await page.locator('button.tab-btn', { hasText: '커뮤니티' }).click()
  })

  test('post list renders with titles', async ({ page }) => {
    await expect(page.locator('text=Best tag combos for Jin/Devil Jin')).toBeVisible()
    await expect(page.locator('text=Looking for sparring partners')).toBeVisible()
    await expect(page.locator('text=Lars wall carry nerfed?')).toBeVisible()
  })

  test('filter buttons are visible', async ({ page }) => {
    await expect(page.locator('button', { hasText: '전체' })).toBeVisible()
    await expect(page.locator('button', { hasText: '자유' })).toBeVisible()
    await expect(page.locator('button', { hasText: '건의' })).toBeVisible()
    await expect(page.locator('button', { hasText: '공략' })).toBeVisible()
  })

  test('clicking filter button triggers API call with post_type', async ({ page }) => {
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes('/api/community/posts') && req.url().includes('post_type')
    )
    await page.locator('button', { hasText: '자유' }).click()
    await requestPromise
  })

  // Positions only mean something in the game's own arrangement. Without it the
  // roster is neither positional nor sorted unless it is sorted, so the narrow
  // form is alphabetical --- and the DOM order is what changes, so tabbing
  // through the tiles follows what the eye sees.
  test('lists the roster alphabetically when it cannot use the game layout', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'A desktop picker is wide enough to keep the game arrangement.')
    await page.getByRole('button', { name: '캐릭터 필터' }).click()
    const picker = page.getByRole('group', { name: '캐릭터로 거르기' })
    const names = await picker.getByRole('button').evaluateAll(
      (tiles) => tiles.map((tile) => tile.getAttribute('aria-label') ?? ''),
    )
    expect(names.length).toBeGreaterThan(50)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  // The tiles are named by the character alone; the group they sit in is what
  // says they filter ("캐릭터로 거르기"), so repeating "Filter by" on all
  // sixty would be read out on every one of them.
  test('picking two characters filters by that team', async ({ page }) => {
    // Folded away until asked for: sixty portraits are taller than a phone
    // screen, and opening this tab used to show the filter and not one post.
    await page.getByRole('button', { name: '캐릭터 필터' }).click()
    const picker = page.getByRole('group', { name: '캐릭터로 거르기' })
    await picker.getByRole('button', { name: 'Jin', exact: true }).click()
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes('/api/community/posts') && new URL(req.url()).searchParams.getAll('characters').length === 2
    )
    await picker.getByRole('button', { name: 'Kazuya', exact: true }).click()
    expect(new URL((await requestPromise).url()).searchParams.getAll('characters')).toEqual(['Jin', 'Kazuya'])
  })

  test('clicking a post opens detail view', async ({ page }) => {
    await page.locator('button', { hasText: 'Best tag combos for Jin/Devil Jin' }).click()

    // Wait for the back button to appear (signals detail view loaded)
    await page.locator('button', { hasText: '목록' }).waitFor({ timeout: 10_000 })

    // Post detail shows title and body
    await expect(page.locator('text=Best tag combos for Jin/Devil Jin')).toBeVisible()
    await expect(page.locator('text=Mishima-style moves')).toBeVisible()
  })

  test('post detail shows comments', async ({ page }) => {
    await page.locator('button', { hasText: 'Best tag combos for Jin/Devil Jin' }).click()
    await page.locator('button', { hasText: '목록' }).waitFor({ timeout: 10_000 })

    await expect(page.locator('text=Great guide! EWGF into tag assault is devastating.')).toBeVisible()
    await expect(page.locator('text=What are the best wall carry routes?')).toBeVisible()
  })

  test('post detail shows nested reply', async ({ page }) => {
    await page.locator('button', { hasText: 'Best tag combos for Jin/Devil Jin' }).click()
    await page.locator('button', { hasText: '목록' }).waitFor({ timeout: 10_000 })

    await expect(page.locator('text=Thanks! Yeah the damage scaling is really favorable.')).toBeVisible()
  })

  test('write button opens create post form', async ({ page }) => {
    await page.locator('button', { hasText: '글쓰기' }).click()

    // CreatePostForm should have title/body inputs and submit
    await expect(page.locator('input, textarea').first()).toBeVisible()
  })
})
