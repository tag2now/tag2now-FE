import { test, expect } from '@playwright/test'
import roomsData from '../fixtures/rooms.json' with { type: 'json' }
import { mockAllApis, signInAs, skipPatchNotes } from '../helpers/mock-api'

const CHANNEL_ID = 'c42cd75ec4855a9edf204a407c3c1dd2'
const STREAM = {
  platform: 'chzzk', channel_name: '마스터 채널', url: `https://chzzk.naver.com/live/${CHANNEL_ID}`,
  title: 'TTT2 랭크전 방송', viewer_count: 42,
}

/** The fixture's rooms, with the first rank match's first player on air. */
function roomsWithALiveHost() {
  const rooms = structuredClone(roomsData)
  rooms.rank_match[0].users[0] = { ...rooms.rank_match[0].users[0], stream: STREAM } as typeof rooms.rank_match[0]['users'][0]
  return rooms
}

test.describe('Live on Chzzk', () => {
  test.beforeEach(async ({ page }) => {
    await skipPatchNotes(page)
  })

  test('a live player carries a LIVE link to the broadcast: left of the name, above it on a phone', async ({ page }, info) => {
    await mockAllApis(page, { rooms: roomsWithALiveHost() })
    await page.goto('/match/rank_match')

    const badge = page.getByRole('link', { name: 'TTT2_Master 치지직 방송 보기: TTT2 랭크전 방송 (새 창)' })
    await expect(badge).toBeVisible()
    await expect(badge).toHaveAttribute('href', STREAM.url)
    await expect(badge).toHaveAttribute('target', '_blank')
    // Only the live player has one.
    await expect(page.getByRole('link', { name: /치지직 방송 보기/ })).toHaveCount(1)

    // The badge stays within the name's cell at every width, the phone's included.
    const cell = page.getByRole('cell').filter({ has: badge })
    const name = page.getByRole('button', { name: 'TTT2_Master' })
    await expect(name).toBeVisible()
    const [cellBox, badgeBox, nameBox] = [await cell.boundingBox(), await badge.boundingBox(), await name.boundingBox()]
    expect(badgeBox!.x).toBeGreaterThanOrEqual(cellBox!.x)
    expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(cellBox!.x + cellBox!.width)
    expect(badgeBox!.y).toBeGreaterThanOrEqual(cellBox!.y)
    if (info.project.name === 'mobile') {
      // Above the name, which stays centred on the row like a name with no badge.
      expect(badgeBox!.y + badgeBox!.height).toBeLessThanOrEqual(nameBox!.y + 1)
      expect(Math.abs(nameBox!.y + nameBox!.height / 2 - (cellBox!.y + cellBox!.height / 2))).toBeLessThanOrEqual(2)
    } else {
      expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(nameBox!.x + 1)
    }
  })

  test('a player connects their channel from the account menu, then disconnects it', async ({ page }) => {
    await mockAllApis(page)
    await signInAs(page, 'alice', '앨리스')
    await page.goto('/')

    const header = page.locator('#headerProfileSlot')
    await header.getByRole('button', { name: '앨리스 계정 메뉴' }).click()
    await header.getByRole('menuitem', { name: '방송 채널' }).click()

    const dialog = page.getByRole('dialog', { name: '방송 채널' })
    await dialog.getByLabel('치지직 채널 주소').fill('내 방송')
    await dialog.getByRole('button', { name: '연결' }).click()
    await expect(dialog.getByRole('alert')).toHaveText('치지직 채널 주소를 확인해 주세요. 예: https://chzzk.naver.com/채널ID')

    await dialog.getByLabel('치지직 채널 주소').fill(`https://chzzk.naver.com/${CHANNEL_ID}`)
    await dialog.getByRole('button', { name: '연결' }).click()
    await expect(dialog.getByRole('link', { name: 'alice 채널' })).toHaveAttribute('href', `https://chzzk.naver.com/live/${CHANNEL_ID}`)

    await dialog.getByRole('button', { name: '연결 해제' }).click()
    await expect(dialog.getByRole('link', { name: 'alice 채널' })).toHaveCount(0)
    await dialog.getByRole('button', { name: '닫기' }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('an admin removes a channel someone connected', async ({ page }) => {
    await mockAllApis(page, {
      streamChannels: [{
        username: 'mallory', platform: 'chzzk', channel_id: CHANNEL_ID, channel_name: '남의 채널',
        channel_url: `https://chzzk.naver.com/live/${CHANNEL_ID}`, registered_at: '2026-10-11T00:00:00Z',
      }],
    })
    await signInAs(page, 'root', '운영자', true)
    await page.goto('/admin')

    const list = page.getByRole('list', { name: '연결된 방송 채널' })
    await expect(list.getByRole('link', { name: '남의 채널' })).toBeVisible()
    await list.getByRole('button', { name: 'mallory의 채널 연결 삭제' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click()

    await expect(page.getByText('연결된 채널이 없습니다.')).toBeVisible()
    await expect(page.getByText('mallory의 채널 연결을 삭제했습니다.')).toBeVisible()
  })
})
