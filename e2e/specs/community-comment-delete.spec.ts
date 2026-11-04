import { test, expect, type Page } from '@playwright/test'
import { mockAllApis, signInAs, skipPatchNotes } from '../helpers/mock-api'
import detail from '../fixtures/community-post-detail.json' with { type: 'json' }

type Comment = (typeof detail.comments)[number] & { deleted?: boolean }

/** The post as the backend would answer it after each delete: a comment with
 * replies stays as an empty placeholder, any other one leaves the thread. */
async function servePost(page: Page) {
  let comments: Comment[] = structuredClone(detail.comments)
  const deleted: number[] = []
  await page.route('**/api/community/posts/1/comments/*', async (route) => {
    const id = Number(route.request().url().split('/').pop())
    deleted.push(id)
    comments = comments.flatMap((c) => {
      if (c.id !== id) return [{ ...c, replies: c.replies.filter((r) => r.id !== id) }]
      return c.replies.length ? [{ ...c, body: '', deleted: true }] : []
    })
    await route.fulfill({ status: 204, body: '' })
  })
  await page.route('**/api/community/posts/1{,?*}', (route) => route.fulfill({ json: { ...detail, comments } }))
  return deleted
}

async function openPost(page: Page, username: string, admin = false) {
  await mockAllApis(page)
  await signInAs(page, username, username, admin)
  await skipPatchNotes(page)
  const deleted = await servePost(page)
  await page.goto('/community/1')
  await expect(page.getByRole('heading', { name: detail.title })).toBeVisible()
  return deleted
}

async function deleteComment(page: Page, author: string) {
  await page.getByRole('button', { name: `${author}님의 댓글 삭제` }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '삭제', exact: true }).click()
}

test('an admin deletes anyone’s comment, and one with replies stays as a placeholder', async ({ page }) => {
  const deleted = await openPost(page, 'root', true)

  await deleteComment(page, 'KingOfIronFist')
  await expect(page.getByText('삭제된 댓글입니다.')).toBeVisible()
  await expect(page.getByText('Great guide! EWGF into tag assault is devastating.')).toHaveCount(0)
  await expect(page.getByText('Thanks! Yeah the damage scaling is really favorable.')).toBeVisible()

  await deleteComment(page, 'NewChallenger')
  await expect(page.getByText('What are the best wall carry routes?')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '댓글 (0)' })).toBeVisible()
  expect(deleted).toEqual([101, 103])
})

test('a player is offered delete on their own comment only', async ({ page }) => {
  await openPost(page, 'NewChallenger')

  await expect(page.getByRole('button', { name: /님의 댓글 삭제$/ })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'NewChallenger님의 댓글 삭제' })).toBeVisible()
})
