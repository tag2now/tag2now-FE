import { Page } from '@playwright/test'
import leaderboardData from '../fixtures/leaderboard.json'
import roomsData from '../fixtures/rooms.json'
import communityPostsData from '../fixtures/community-posts.json'
import communityPostDetailData from '../fixtures/community-post-detail.json'

interface ApiReservationLike {
  id: number
  start_at: string
  duration_minutes: number
  host_display_name: string
  host_ranks: string[]
  match_type: 'rank_match' | 'player_match'
  capacity: number
  memo: string
  status: 'open' | 'matched' | 'cancelled' | 'ended'
  participant_count: number
  created_at: string
}

interface MockOverrides {
  leaderboard?: unknown
  rooms?: unknown
  posts?: unknown
  postDetail?: unknown
  reservations?: ApiReservationLike[]
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

  // Reservations are stateful: a POST has to show up in the next GET, or the
  // card the caller just created never renders. Without this route the specs
  // fall through the dev proxy and write to the real backend.
  const reservations: ApiReservationLike[] = [...(overrides?.reservations ?? [])]
  let nextId = reservations.reduce((max, item) => Math.max(max, item.id), 0) + 1

  await page.route('**/api/reservations**', async (route) => {
    const method = route.request().method()
    const url = route.request().url()

    if (url.includes('/participants')) {
      const id = Number(url.match(/reservations\/(\d+)/)?.[1])
      const target = reservations.find((item) => item.id === id)
      if (!target) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'not found' }) })
      target.participant_count += method === 'DELETE' ? -1 : 1
      target.status = method === 'DELETE' ? 'open' : 'matched'
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(method === 'DELETE' ? target : { reservation: target, participant_token: 'test-participant-token' }),
      })
    }

    if (method === 'POST') {
      if (failing.has('createReservation')) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ detail: '예약을 만들지 못했습니다.' }) })
      }
      const body = route.request().postDataJSON()
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
      const reservation: ApiReservationLike = {
        id: nextId++,
        start_at: `${today}T${body.start_time}+09:00`,
        duration_minutes: body.duration_minutes,
        host_display_name: body.display_name,
        host_ranks: body.ranks,
        match_type: body.match_type,
        capacity: body.capacity,
        memo: body.memo,
        status: 'open',
        participant_count: 0,
        created_at: new Date().toISOString(),
      }
      reservations.push(reservation)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reservation, owner_token: 'test-owner-token' }),
      })
    }

    if (failing.has('reservations')) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: '예약을 불러오지 못했습니다.' }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reservations) })
  })
}
