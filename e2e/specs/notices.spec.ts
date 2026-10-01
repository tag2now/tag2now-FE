import { test, expect } from '@playwright/test'
import { mockAllApis, signInAs, skipPatchNotes } from '../helpers/mock-api'

const NOTICE = {
  id: 77, author: 'root', title: '서버 점검 안내', body: '내일 점검합니다', post_type: '공지',
  characters: [], youtube_video_id: null, thumbs_up: 0, thumbs_down: 0,
  created_at: new Date().toISOString(), comment_count: 0,
}

test.describe('Notices', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, { notices: [NOTICE] })
    await skipPatchNotes(page)
  })

  test('the home page leads with the notice and opens it', async ({ page }) => {
    await page.goto('/')

    const banner = page.getByRole('region', { name: '공지' })
    await expect(banner).toContainText('서버 점검 안내')
    await banner.getByRole('link', { name: /서버 점검 안내/ }).click()
    await expect(page).toHaveURL(/\/community\/77$/)
  })

  test('the board pins the notice above its filters', async ({ page }) => {
    await page.goto('/community')

    const pinned = page.getByRole('region', { name: '공지' })
    await expect(pinned.getByRole('button', { name: /서버 점검 안내/ })).toBeVisible()
    // Pinned means above everything the filters narrow, posts included.
    const pinnedBox = await pinned.boundingBox()
    const filtersBox = await page.getByRole('group', { name: '게시글 분류' }).boundingBox()
    expect(pinnedBox!.y).toBeLessThan(filtersBox!.y)
    await expect(page.locator('.post-list:not(.notice-list)')).not.toContainText('서버 점검 안내')
  })

  test('only an admin is offered 공지 when writing', async ({ page }) => {
    await signInAs(page, 'root', '운영자', true)
    await page.goto('/community')
    await page.getByRole('button', { name: '글쓰기' }).click()

    await expect(page.locator('.writing-form').getByRole('button', { name: '공지', exact: true })).toBeVisible()
  })

  test('a signed-in player is not offered 공지', async ({ page }) => {
    await signInAs(page, 'alice')
    await page.goto('/community')
    await page.getByRole('button', { name: '글쓰기' }).click()

    await expect(page.locator('.writing-form').getByRole('button', { name: '자유', exact: true })).toBeVisible()
    await expect(page.locator('.writing-form').getByRole('button', { name: '공지', exact: true })).toHaveCount(0)
  })
})
