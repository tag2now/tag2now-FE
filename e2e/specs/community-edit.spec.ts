import { test, expect } from '@playwright/test'
import { mockAllApis, signInAs, skipPatchNotes } from '../helpers/mock-api'
import detail from '../fixtures/community-post-detail.json'

test('author can cancel, replace and remove a video while editing', async ({ page }) => {
  let saved = { ...detail, author: 'edit-owner', youtube_video_id: 'M7lc1UVf-VE' as string | null }
  let writes = 0
  await mockAllApis(page)
  await signInAs(page, 'edit-owner')
  await skipPatchNotes(page)
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Player' }))
  await page.route('**/api/community/posts/1{,?*}', async route => {
    if (route.request().method() === 'PATCH') {
      saved = { ...saved, ...route.request().postDataJSON() }
      writes++
    }
    await route.fulfill({ json: saved })
  })
  await page.goto('/community/1')
  await page.getByRole('button', { name: '수정', exact: true }).click()
  await expect(page.getByLabel('게시글 제목')).toHaveValue(saved.title)
  await page.getByLabel('게시글 제목').fill('cancel this')
  await page.getByRole('button', { name: '취소', exact: true }).click()
  await expect(page.getByRole('heading', { name: saved.title, exact: true })).toBeVisible()
  expect(writes).toBe(0)

  await page.getByRole('button', { name: '수정', exact: true }).click()
  await page.getByLabel('게시글 제목').fill('수정된 영상 공략')
  await page.getByLabel('게시글 내용').fill('변경된 본문')
  await page.getByLabel('YouTube 영상 (선택)').fill('https://youtu.be/aqz-KE-bpKQ')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('heading', { name: '수정된 영상 공략', exact: true })).toBeVisible()
  await expect(page.getByTitle('첨부된 YouTube 영상 플레이어')).toHaveAttribute('src', /aqz-KE-bpKQ/)
  expect(writes).toBe(1)

  await page.getByRole('button', { name: '수정', exact: true }).click()
  await page.getByRole('button', { name: 'YouTube 영상 제거' }).click()
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('heading', { name: '수정된 영상 공략', exact: true })).toBeVisible()
  await expect(page.getByTitle('첨부된 YouTube 영상 플레이어')).toHaveCount(0)
  expect(saved.youtube_video_id).toBeNull()
  expect(writes).toBe(2)
})
