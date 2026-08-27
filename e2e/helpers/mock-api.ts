import { Page, Route } from '@playwright/test'
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

export interface ApiReservation {
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

/** A start_at two hours out, so the backend's 10-minute lead time is moot. */
export function reservationAt(hour: number, overrides: Partial<ApiReservation> = {}): ApiReservation {
  const start = new Date()
  start.setUTCHours(hour - 9, 0, 0, 0)  // the UI renders start_at in KST
  return {
    id: 1,
    start_at: start.toISOString(),
    duration_minutes: 60,
    host_display_name: '상대',
    host_ranks: ['Vanquisher'],
    match_type: 'rank_match',
    capacity: 1,
    memo: '',
    status: 'open',
    participant_count: 0,
    created_at: start.toISOString(),
    ...overrides,
  }
}

/**
 * Set the username the reservation flows require, before the app reads it.
 *
 * Creating or joining a reservation is refused outright without one, so a spec
 * that skips this gets a notice instead of the request it was asserting on.
 */
export async function signInAs(page: Page, username: string) {
  await page.addInitScript((name) => {
    localStorage.setItem('ttt2-username', name)
  }, username)
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

  // Reservations. Stateful, because the flows worth testing are transitions:
  // joining fills the last slot and settles the match, cancelling reopens it.
  // Without this route the requests would reach whatever the dev server
  // proxies to — production, by default.
  const reservations = new Map((overrides?.reservations ?? []).map((item) => [item.id, { ...item }]))
  let nextId = Math.max(0, ...reservations.keys()) + 1

  const asJson = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  await page.route('**/api/reservations**', async (route) => {
    if (failing.has('reservations')) {
      return route.fulfill({ status: 500, body: 'Internal Server Error' })
    }

    const url = route.request().url()
    const method = route.request().method()
    const id = Number(url.match(/\/reservations\/(\d+)/)?.[1])
    const reservation = reservations.get(id)

    if (method === 'POST' && !id) {
      const body = route.request().postDataJSON()
      const created = reservationAt(Number(body.start_time.slice(0, 2)), {
        ...body,
        id: nextId,
        host_display_name: body.display_name,
        host_ranks: body.ranks,
        duration_minutes: body.duration_minutes,
      })
      reservations.set(nextId, created)
      nextId += 1
      return asJson(route, { reservation: created, owner_token: `owner-${created.id}` }, 201)
    }

    if (!reservation) {
      if (method === 'GET') return asJson(route, [...reservations.values()].filter((item) => item.status !== 'cancelled'))
      return asJson(route, { detail: 'Reservation not found' }, 404)
    }

    if (method === 'POST') {
      if (reservation.participant_count >= reservation.capacity) {
        return asJson(route, { detail: '이미 마감된 예약입니다.' }, 400)
      }
      reservation.participant_count += 1
      reservation.status = reservation.participant_count >= reservation.capacity ? 'matched' : 'open'
      return asJson(route, { reservation, participant_token: `participant-${id}` }, 201)
    }

    if (url.includes('/participants/me')) {
      reservation.participant_count = Math.max(0, reservation.participant_count - 1)
      reservation.status = 'open'
      return asJson(route, reservation)
    }

    reservation.status = 'cancelled'
    return route.fulfill({ status: 204, body: '' })
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
