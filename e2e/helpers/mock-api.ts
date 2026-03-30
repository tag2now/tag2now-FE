import { Page } from '@playwright/test'
import leaderboardData from '../fixtures/leaderboard.json'
import roomsData from '../fixtures/rooms.json'
import communityPostsData from '../fixtures/community-posts.json'
import communityPostDetailData from '../fixtures/community-post-detail.json'

interface MockOverrides {
  leaderboard?: unknown
  rooms?: unknown
  posts?: unknown
  postDetail?: unknown
  failEndpoints?: string[]
}

/**
 * Dismiss the PatchNotes modal. Call after page.goto().
 */
export async function dismissPatchNotes(page: Page) {
  const closeBtn = page.locator('button[aria-label="Close"]')
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click()
  }
}

export async function mockAllApis(page: Page, overrides?: MockOverrides) {
  const failing = new Set(overrides?.failEndpoints ?? [])

  await page.route('**/api/leaderboard**', async (route) => {
    if (failing.has('leaderboard')) {
      return route.fulfill({ status: 500, body: 'Internal Server Error' })
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overrides?.leaderboard ?? leaderboardData),
    })
  })

  await page.route('**/api/rooms/all**', async (route) => {
    if (failing.has('rooms')) {
      return route.fulfill({ status: 500, body: 'Internal Server Error' })
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overrides?.rooms ?? roomsData),
    })
  })

  // Single handler for all community API calls
  await page.route('**/api/community/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    // Identity endpoint
    if (url.includes('/community/identity')) {
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ name: 'TestUser' }),
        })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }

    // Post actions: thumb, comments
    if (url.match(/\/posts\/\d+\/(thumb|comments)/)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }

    // Post detail: /posts/{id} (GET, DELETE)
    if (url.match(/\/posts\/\d+/)) {
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(overrides?.postDetail ?? communityPostDetailData),
        })
      }
      // DELETE
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }

    // Posts list (GET) or creation (POST): /posts?... or /posts
    if (method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 999, title: 'New Post' }),
      })
    }

    // GET — posts list
    if (failing.has('posts')) {
      return route.fulfill({ status: 500, body: 'Internal Server Error' })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overrides?.posts ?? communityPostsData),
    })
  })
}
