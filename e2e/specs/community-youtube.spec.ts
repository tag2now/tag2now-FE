import { test, expect } from '@playwright/test'
import { mockAllApis, signInAs, skipPatchNotes } from '../helpers/mock-api'
import detail from '../fixtures/community-post-detail.json'

test.beforeEach(async ({ page }) => {
  await mockAllApis(page, { postDetail: { ...detail, youtube_video_id: 'dQw4w9WgXcQ' } })
  await skipPatchNotes(page)
  await signInAs(page, 'video-tester')
  // Player availability is external; verify our embedding contract without network calls.
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<body>Video player</body>' }))
})

test('preview, validation, removal and posting an attached video', async ({ page }) => {
  await page.goto('/community')
  await page.getByRole('button', { name: '글쓰기' }).click()
  await page.getByLabel('게시글 제목').fill('영상 공략')
  await page.getByLabel('게시글 내용').fill('콤보 설명')
  const input = page.getByLabel('YouTube 영상 (선택)')
  await input.fill('https://example.com/video')
  await expect(page.getByRole('alert')).toHaveText('올바른 YouTube 영상 링크를 입력해 주세요.')
  await expect(page.getByRole('button', { name: '작성', exact: true })).toBeDisabled()
  await input.fill('https://youtu.be/dQw4w9WgXcQ?si=tracking')
  await expect(page.getByTitle('첨부된 YouTube 영상 플레이어')).toBeVisible()
  await expect(page.getByRole('link', { name: 'YouTube에서 보기' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'YouTube 영상 제거' }).click()
  await expect(page.getByTitle('첨부된 YouTube 영상 플레이어')).toHaveCount(0)
  await input.fill('https://www.youtube.com/shorts/dQw4w9WgXcQ')
  const request = page.waitForRequest(req => req.method() === 'POST' && req.url().endsWith('/api/community/posts'))
  await page.getByRole('button', { name: '작성', exact: true }).click()
  expect((await request).postDataJSON()).toEqual({ title: '영상 공략', body: '콤보 설명', post_type: '자유', youtube_video_id: 'dQw4w9WgXcQ' })
})

test('detail embeds the saved video without overflowing the screen', async ({ page }) => {
  await page.goto('/community/1')
  const player = page.getByTitle('첨부된 YouTube 영상 플레이어')
  await expect(player).toBeVisible()
  await expect(player).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?playsinline=1')
  await expect(player).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  const bounds = await player.boundingBox()
  expect(bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(bounds!.height).toBeCloseTo(bounds!.width * 9 / 16, 0)
  await page.screenshot({ path: `e2e/test-results/youtube-${test.info().project.name}.png`, fullPage: true })
})
