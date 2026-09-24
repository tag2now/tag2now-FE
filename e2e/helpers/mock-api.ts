import { expect, Page, Route } from '@playwright/test'
import leaderboardData from '../fixtures/leaderboard.json'
import roomsData from '../fixtures/rooms.json'
import communityPostsData from '../fixtures/community-posts.json'
import communityPostDetailData from '../fixtures/community-post-detail.json'
import { LATEST_PATCH_VERSION } from '../../src/config/patchNotes'
import dailyStatsData from '../fixtures/history-daily.json'
import weeklyTopData from '../fixtures/history-weekly-top.json'

interface ApiReservationLike {
  id: number
  start_at: string
  host_display_name: string
  /** RPCN id of the host; null on a reservation from before login. */
  host_username: string | null
  host_ranks: string[]
  match_type: 'rank_match' | 'player_match' | 'any'
  capacity: number
  memo: string
  status: 'open' | 'matched' | 'cancelled' | 'ended'
  participant_count: number
  participants?: { id: number, display_name: string, username: string | null }[]
  created_at: string
}

interface ApiCommentLike {
  id: number
  reservation_id: number
  author: string
  author_username: string | null
  body: string
  created_at: string
}

interface MockOverrides {
  leaderboard?: unknown
  rooms?: unknown
  posts?: unknown
  postDetail?: unknown
  reservations?: ApiReservationLike[]
  daily?: unknown
  weeklyTop?: unknown
  hourly?: unknown
  /** Keyed by npid. A player the map does not name still gets a response. */
  playerHistory?: Record<string, unknown>
  failEndpoints?: string[]
}

export interface ApiReservation {
  id: number
  start_at: string
  host_display_name: string
  /** RPCN id of the host; null on a reservation from before login. */
  host_username: string | null
  host_ranks: string[]
  match_type: 'rank_match' | 'player_match' | 'any'
  capacity: number
  memo: string
  status: 'open' | 'matched' | 'cancelled' | 'ended'
  participant_count: number
  participants?: { id: number, display_name: string, username: string | null }[]
  created_at: string
}

/** The board's posts, dated from the moment the spec runs.
 *
 * Their `created_at` used to be fixed dates in the fixture, which aged: the
 * newest post was written in March and the suite now runs in September, so
 * anything the app measures against the clock — 방금 전 on a row, the sidebar's
 * 24-hour new-post count — saw a board that had been silent for months and
 * rendered the empty case. The rest of the fixture is still the fixture; only
 * the timestamps are rewritten, keeping its existing oldest-first order and
 * straddling that 24-hour window on purpose — two posts inside it, one out.
 */
export function communityPosts(): typeof communityPostsData {
  const hoursAgo = [30, 5, 1]
  const posts = communityPostsData.posts.map((post, index) => ({
    ...post,
    created_at: new Date(Date.now() - hoursAgo[index % hoursAgo.length] * 3_600_000).toISOString(),
  }))
  return { ...communityPostsData, posts }
}

/** A start_at two hours out, so the backend's 10-minute lead time is moot. */
export function reservationAt(hour: number, overrides: Partial<ApiReservation> = {}): ApiReservation {
  const start = new Date()
  start.setUTCHours(hour - 9, 0, 0, 0)  // the UI renders start_at in KST
  return {
    id: 1,
    start_at: start.toISOString(),
    host_display_name: '상대',
    host_username: 'rival',
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

/** The token the mock hands out for an account, and reads the account back from. */
const tokenFor = (username: string) => `e2e:${encodeURIComponent(username)}`

/** The account a request was sent as, or null when it carried no token. */
function requester(route: Route): string | null {
  const header = route.request().headers()['authorization'] ?? ''
  const token = header.startsWith('Bearer e2e:') ? header.slice('Bearer e2e:'.length) : null
  return token === null ? null : decodeURIComponent(token)
}

/**
 * Start the page signed in as an RPCN account, before the app reads it.
 *
 * Writes the session the login dialog would have stored, so a spec about
 * something else does not have to drive the dialog. The online name defaults
 * to the username, which keeps what a spec types and what it asserts the same;
 * pass the leaderboard's online name to sign in as one of its np_ids.
 */
export async function signInAs(page: Page, username: string, onlineName = username) {
  await page.addInitScript(([key, token, id, name]) => {
    localStorage.setItem(key, JSON.stringify({
      token,
      expiresAt: Date.now() + 3_600_000,
      user: { username: id, online_name: name, avatar_url: '', admin: false },
    }))
  }, ['ttt2-session', tokenFor(username), username, onlineName] as const)
}

/**
 * Dismiss the PatchNotes modal. Call after page.goto().
 *
 * The dialog always shows on a fresh context, so wait for it rather than
 * polling with a short budget: under a full parallel run it has been measured
 * taking ~1.0-1.5s to paint, and the old 2s `.catch(() => false)` gave up
 * silently when it lapsed. The modal then stayed open over the page and the
 * test failed somewhere else entirely, on whatever content it covered.
 */
export async function dismissPatchNotes(page: Page) {
  const closeBtn = page.locator('button[aria-label="Close"]')
  await closeBtn.waitFor({ state: 'visible' })
  await closeBtn.click()
  await expect(page.locator('[aria-labelledby="patch-notes-title"]')).toHaveCount(0)
}

/**
 * Land on the match tab.
 *
 * 개요 is the landing tab, so a spec about rooms has to navigate first. It goes
 * through the tab's accessible name rather than a URL, because the SPA has no
 * router — the tab strip is the only way in.
 */
/**
 * Mark the patch notes as already seen, so the dialog never opens.
 *
 * Faster than dismissPatchNotes and, more importantly, usable by tests that
 * cannot afford the modal's paint at all. The version comes from the app's own
 * source of truth, so a version bump does not silently stop suppressing it.
 */
export async function skipPatchNotes(page: Page) {
  await page.addInitScript((version) => {
    localStorage.setItem('ttt2-patch-dismissed', version)
  }, LATEST_PATCH_VERSION)
}

export async function goToMatchTab(page: Page) {
  await page.getByRole('tab', { name: '매칭' }).click()
  await expect(page.getByRole('tablist', { name: '매칭 종류 선택' })).toBeVisible()
}

export async function mockAllApis(page: Page, overrides?: MockOverrides) {
  const failing = new Set(overrides?.failEndpoints ?? [])

  // Any password is right, except the one a spec uses to see the refusal.
  await page.route('**/api/auth/login', async (route) => {
    const { username, password } = route.request().postDataJSON()
    if (password === 'wrong') {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: '아이디 또는 비밀번호가 올바르지 않습니다.' }) })
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: tokenFor(username),
        token_type: 'bearer',
        expires_in: 3600,
        user: { username, online_name: username, avatar_url: '', admin: false },
      }),
    })
  })

  /** Every write needs an account, as on the backend. */
  const signedOut = (route: Route) => route.fulfill({
    status: 401, contentType: 'application/json', body: JSON.stringify({ detail: '로그인이 필요합니다.' }),
  })

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

  // Comments hang off the reservation URL, so they match the route below too
  // and need a branch of their own. Without one the detail panel's comment
  // fetch fell through to the handlers at the bottom: a GET reached the cancel
  // and quietly soft-deleted the reservation the host was looking at, a POST
  // counted as somebody joining it.
  const comments = new Map<number, ApiCommentLike[]>()
  let nextCommentId = 1

  const handleComments = (route: Route, id: number) => {
    const method = route.request().method()
    const thread = comments.get(id) ?? []
    if (method === 'GET') return asJson(route, thread)
    const me = requester(route)
    if (!me) return signedOut(route)
    if (method === 'POST') {
      const { body } = route.request().postDataJSON()
      const comment = { id: nextCommentId, reservation_id: id, author: me, author_username: me, body, created_at: new Date().toISOString() }
      nextCommentId += 1
      comments.set(id, [...thread, comment])
      return asJson(route, comment, 201)
    }
    if (method === 'DELETE') {
      const commentId = Number(route.request().url().match(/\/comments\/(\d+)/)?.[1])
      if (thread.find((item) => item.id === commentId)?.author_username !== me) {
        return asJson(route, { detail: '작성한 사람만 삭제할 수 있습니다.' }, 403)
      }
      comments.set(id, thread.filter((item) => item.id !== commentId))
      return route.fulfill({ status: 204, body: '' })
    }
    return asJson(route, { detail: 'Not found' }, 404)
  }

  await page.route('**/api/reservations**', async (route) => {
    if (failing.has('reservations')) {
      return route.fulfill({ status: 500, body: 'Internal Server Error' })
    }

    const url = route.request().url()
    const method = route.request().method()
    const id = Number(url.match(/\/reservations\/(\d+)/)?.[1])
    const reservation = reservations.get(id)
    const me = requester(route)

    if (method === 'POST' && !id) {
      if (!me) return signedOut(route)
      const body = route.request().postDataJSON()
      const created = reservationAt(Number(body.start_time.slice(0, 2)), {
        ...body,
        id: nextId,
        host_display_name: me,
        host_username: me,
        host_ranks: body.ranks,
        participants: [],
      })
      reservations.set(nextId, created)
      nextId += 1
      return asJson(route, created, 201)
    }

    if (!reservation) {
      if (method === 'GET') return asJson(route, [...reservations.values()].filter((item) => item.status !== 'cancelled'))
      return asJson(route, { detail: 'Reservation not found' }, 404)
    }

    if (url.includes('/comments')) return handleComments(route, id)

    if (method !== 'GET' && !me) return signedOut(route)

    if (method === 'PATCH') {
      if (reservation.host_username !== me) return asJson(route, { detail: '예약한 사람만 수정할 수 있습니다.' }, 403)
      // Mirror the backend: a reservation somebody joined is frozen.
      if (reservation.participant_count > 0) {
        return asJson(route, { detail: '참가자가 있는 예약은 수정할 수 없습니다. 삭제 후 다시 등록해 주세요.' }, 400)
      }
      const patch = route.request().postDataJSON()
      Object.assign(reservation, patch, patch.ranks ? { host_ranks: patch.ranks } : {})
      return asJson(route, reservation)
    }

    if (method === 'POST') {
      if (reservation.host_username === me) {
        return asJson(route, { detail: '내가 만든 예약에는 참가할 수 없습니다.' }, 400)
      }
      if (reservation.participant_count >= reservation.capacity) {
        return asJson(route, { detail: '이미 마감된 예약입니다.' }, 400)
      }
      reservation.participants = [...(reservation.participants ?? []), { id: 1000 + reservation.participant_count, display_name: me!, username: me }]
      reservation.participant_count += 1
      reservation.status = reservation.participant_count >= reservation.capacity ? 'matched' : 'open'
      return asJson(route, reservation, 201)
    }

    if (url.includes('/participants/me')) {
      const seats = reservation.participants ?? []
      if (!seats.some((seat) => seat.username === me)) return asJson(route, { detail: '참가 중인 예약이 아닙니다.' }, 403)
      reservation.participants = seats.filter((seat) => seat.username !== me)
      reservation.participant_count = Math.max(0, reservation.participant_count - 1)
      reservation.status = 'open'
      return asJson(route, reservation)
    }

    if (method === 'DELETE') {
      if (reservation.host_username !== me) return asJson(route, { detail: '예약한 사람만 취소할 수 있습니다.' }, 403)
      reservation.status = 'cancelled'
      return route.fulfill({ status: 204, body: '' })
    }

    // An unmatched request is a gap in this mock, not licence to improvise.
    // This used to fall through to the cancel above, which is how adding a
    // comments fetch turned into a silent soft delete three commits later.
    return asJson(route, { detail: 'Not found' }, 404)
  })

  // History statistics. The overview is the landing tab and calls these on
  // every page load, so leaving them unrouted would send each spec's first
  // paint to whatever the dev server proxies to — production, by default.
  await page.route('**/api/history/stats**', async (route) => {
    if (failing.has('history')) {
      return route.fulfill({ status: 500, body: 'Internal Server Error' })
    }
    const url = route.request().url()
    if (url.includes('/weekly-top')) return asJson(route, overrides?.weeklyTop ?? weeklyTopData)
    if (url.includes('/daily')) return asJson(route, overrides?.daily ?? dailyStatsData)
    return asJson(route, overrides?.hourly ?? [])
  })

  // One player's history. `**/api/history/stats**` above does NOT match this —
  // the path is /history/players/{npid} — so until this route existed, every
  // spec that opened the history panel sent its request to whatever the dev
  // server proxies to, which is production.
  await page.route('**/api/history/players/**', async (route) => {
    const npid = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '')
    return asJson(route, overrides?.playerHistory?.[npid] ?? {
      npid,
      times_seen: 120,
      days_active: 12,
      first_seen: '2026-08-01',
      last_seen: '2026-09-15',
      room_type_counts: { rank_match: 80, player_match: 40 },
      // Everyone played with the next two people on the board, so a spec can
      // open a partner and land on a player the leaderboard fixture knows.
      top_played_with: [
        { npid: 'np_002', online_name: 'KingOfIronFist', times_together: 30 },
        { npid: 'np_003', online_name: 'TagComboKing', times_together: 21 },
      ].filter((partner) => partner.npid !== npid),
      active_hours: [20, 21, 22, 23],
    })
  })

  // Single handler for all community API calls
  await page.route('**/api/community/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (method !== 'GET' && !requester(route)) return signedOut(route)

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
      body: JSON.stringify(overrides?.posts ?? communityPosts()),
    })
  })
}
