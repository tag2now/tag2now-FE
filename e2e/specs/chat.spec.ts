import { test, expect, type Page } from '@playwright/test'
import { mockAllApis, signInAs, skipPatchNotes, type ApiChatMessage } from '../helpers/mock-api'

const said = (id: number, author: string, body: string): ApiChatMessage => ({
  id,
  author_username: author,
  author_online_name: `${author}-name`,
  body,
  created_at: new Date(Date.now() - (10 - id) * 60_000).toISOString(),
})

const TODAY = [said(1, 'rival', '오늘 랭매 하실 분'), said(2, 'np_001', '저요')]

const launcher = (page: Page) => page.getByRole('button', { name: /^채팅 열기/ })
const panel = (page: Page) => page.getByRole('region', { name: '채팅' })
const log = (page: Page) => page.getByRole('log', { name: '채팅 메시지' })

/** Below 1350px — Desktop Chrome's 1280 and a phone alike — the chat waits
 * behind its launcher. */
async function showChat(page: Page) {
  await launcher(page).click()
  await expect(panel(page)).toBeVisible()
}

/** Whether two boxes share any pixel. */
type Box = { x: number, y: number, width: number, height: number }
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

test.beforeEach(async ({ page }) => {
  await mockAllApis(page, { chat: TODAY })
  await skipPatchNotes(page)
})

test("reads today's chat without an account", async ({ page }) => {
  await page.goto('/')
  await showChat(page)

  await expect(log(page).getByRole('listitem')).toHaveCount(2)
  await expect(log(page)).toContainText('오늘 랭매 하실 분')
  await expect(panel(page).getByLabel('메시지', { exact: true })).toHaveCount(0)
  await panel(page).getByRole('button', { name: '로그인하고 채팅하기' }).click()
  await expect(page.getByRole('dialog', { name: 'RPCN 로그인' })).toContainText('로그인하면 채팅에 참여할 수 있습니다.')
})

test('sends a line with Enter once signed in, and deletes it again', async ({ page }) => {
  await signInAs(page, 'me')
  await page.goto('/')
  await showChat(page)

  const field = panel(page).getByLabel('메시지', { exact: true })
  await field.fill('21시에 들어갑니다')
  await field.press('Enter')

  const mine = log(page).getByRole('listitem').filter({ hasText: '21시에 들어갑니다' })
  await expect(mine).toBeVisible()
  await expect(field).toHaveValue('')
  // Only my line offers a delete.
  await expect(panel(page).getByRole('button', { name: /님의 메시지 삭제$/ })).toHaveCount(1)
  await mine.getByRole('button', { name: 'me님의 메시지 삭제' }).click()
  await expect(mine).toHaveCount(0)
})

test('stands as a column right of the main one on a wide screen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'A phone keeps the chat behind a launcher.')
  // The narrowest width that docks it, where the main column is tightest.
  await page.setViewportSize({ width: 1350, height: 800 })
  await page.goto('/')

  const main = (await page.locator('#mainContent').boundingBox())!
  const chat = (await panel(page).boundingBox())!
  expect(chat.x).toBeGreaterThanOrEqual(main.x + main.width)
  expect(chat.width).toBe(300)
  await expect(launcher(page)).toHaveCount(0)
  // The width was chosen so the home page's two rankings still share a row.
  const weekly = (await page.getByRole('region', { name: '주간 철악귀' }).boundingBox())!
  const leaderboard = (await page.getByRole('region', { name: '리더보드 TOP 5' }).boundingBox())!
  expect(weekly.y).toBeCloseTo(leaderboard.y, 0)
  await page.screenshot({ path: test.info().outputPath('chat-column.png') })
  // Moving between tabs leaves it where it is.
  await page.getByRole('tab', { name: '리더보드' }).click()
  await expect(page).toHaveURL(/\/leaderboard$/)
  await expect(panel(page)).toBeVisible()
})

test('folds into a bottom-left launcher on a narrower desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The phone layout has a test of its own.')
  // One pixel short of docking.
  await page.setViewportSize({ width: 1349, height: 768 })
  await page.goto('/')

  const nav = (await page.getByRole('tablist', { name: 'Main navigation' }).boundingBox())!
  expect(overlap((await launcher(page).boundingBox())!, nav)).toBe(false)
  await launcher(page).click()

  await expect(panel(page)).toBeFocused()
  expect(await panel(page).boundingBox()).toEqual({ x: 16, y: 768 - 16 - 440, width: 320, height: 440 })
  await page.screenshot({ path: test.info().outputPath('chat-corner.png') })
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: '채팅 열기' })).toBeFocused()
})

test('opens from above the tab bar as a full-screen sheet on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'A desktop shows the chat as a column or a corner panel.')
  await page.goto('/')

  const nav = (await page.getByRole('tablist', { name: 'Main navigation' }).boundingBox())!
  expect(overlap((await launcher(page).boundingBox())!, nav)).toBe(false)
  await launcher(page).click()

  const viewport = page.viewportSize()!
  expect(await panel(page).boundingBox()).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height })
  await page.screenshot({ path: test.info().outputPath('chat-sheet.png') })
  await panel(page).getByRole('button', { name: '채팅 닫기' }).click()
  await expect(page.getByRole('tablist', { name: 'Main navigation' })).toBeVisible()
})
