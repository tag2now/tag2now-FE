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

export interface ApiChatMessage {
  id: number
  author_username: string
  author_online_name: string
  body: string
  created_at: string
}

interface MockOverrides {
  /** Today's chat, as the stream's opening snapshot carries it; none by default. */
  chat?: ApiChatMessage[]
  leaderboard?: unknown
  rooms?: unknown
  posts?: unknown
  /** Answers `?post_type=공지`; none unless a spec sets them. */
  notices?: unknown[]
  postDetail?: unknown
  reservations?: ApiReservationLike[]
  daily?: unknown
  weeklyTop?: unknown
  hourly?: unknown
  /** Keyed by npid. A player the map does not name still gets a response. */
  playerHistory?: Record<string, unknown>
  /** Keyed by npid; null answers "no save" (404). Anyone else gets PLAYER_SAVE. */
  playerSave?: Record<string, unknown | null>
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

/** tag2now-save-admin's answers, as the backend relays them, over one save
 * that every account shares. Only Paul's rank moves: set-rank on character 0
 * changes it and every other edit previews and writes nothing. A write that
 * does not carry the previewed sha256 is refused, as the server would. */
// Only the ranks the spec moves Paul between; the e2e build cannot import the app's own table.
const RANK_NAMES: Record<number, string> = { 0: 'Beginner', 20: 'Berserker', 29: 'Genbu' }

function saveAdminAnswer(action: string, body: Record<string, unknown>, paul: { rank: number }): [number, unknown] {
  const sha256 = `${'0'.repeat(62)}${String(paul.rank).padStart(2, '0')}`
  const slot = (rank: number) => ({ rank, rank_name: RANK_NAMES[rank], points: 1500, streak: 0 })
  const paulRow = { id: 0, character: 'Paul', tier: '', points: 1500, streak: 0, wins: 10, losses: 5, rank: paul.rank, rank_name: RANK_NAMES[paul.rank] }
  if (action === 'show') {
    return [200, {
      username: body.username, data_id: 1001, saved_at: '2026-09-30T12:00:00Z', sha256, checksum_ok: true,
      account_rank: 20, progress: 4, total: 15, wins: 10, losses: 5, online: false,
      chars: [paulRow, { ...paulRow, id: 1, character: 'Law', rank: 0, rank_name: RANK_NAMES[0], wins: 0, losses: 0 }],
    }]
  }
  if (action === 'backups') return [200, { backups: [{ label: 'base', total: 15, account_rank: 20 }] }]
  if (action === 'log') return [200, { records: [] }]
  const target = action === 'set-rank' && body.char === 0 ? Number(body.rank) : paul.rank
  const changes = { account_rank: null, chars: target === paul.rank ? [] : [{ id: 0, character: 'Paul', before: slot(paul.rank), after: slot(target) }] }
  const preview = { username: body.username, sha256, online: false, changes, applied: false, result: null }
  if (body.dry_run) return [200, preview]
  if (body.expect_sha256 !== sha256) return [409, { detail: '미리보기 뒤에 세이브가 바뀌었습니다. 다시 미리보기 해 주세요.' }]
  paul.rank = target
  return [200, { ...preview, applied: true, result: { backup: '20261001-120000-000001', checksum: '0x1', data_id: 1001, landed: true } }]
}

/**
 * Start the page signed in as an RPCN account, before the app reads it.
 *
 * Writes the session the login dialog would have stored, so a spec about
 * something else does not have to drive the dialog. The online name defaults
 * to the username, which keeps what a spec types and what it asserts the same;
 * pass the leaderboard's online name to sign in as one of its np_ids.
 */
export async function signInAs(page: Page, username: string, onlineName = username, admin = false) {
  await page.addInitScript(([key, token, id, name, isAdmin]) => {
    localStorage.setItem(key, JSON.stringify({
      token,
      expiresAt: Date.now() + 3_600_000,
      user: { username: id, online_name: name, avatar_url: '', admin: isAdmin },
    }))
  }, ['ttt2-session', tokenFor(username), username, onlineName, admin] as const)
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

/** A save with two characters played and one slot never used. */
export const PLAYER_SAVE = {
  username: 'np_001',
  saved_at: '2026-09-15T12:00:00Z',
  account_rank: 20,
  total: 15,
  wins: 10,
  losses: 5,
  chars: [
    { id: 0, character: 'Paul', rank: 12, rank_name: '3rd dan', tier: '숫자단', points: 5000, streak: 1, wins: 4, losses: 1 },
    { id: 2, character: 'Lei', rank: 20, rank_name: 'Berserker', tier: '초록단', points: 1500, streak: -2, wins: 6, losses: 4 },
    { id: 3, character: 'King', rank: 0, rank_name: 'Beginner', tier: '숫자단', points: 0, streak: 0, wins: 0, losses: 0 },
  ],
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

  /* rpcn-narco's answers, as the backend relays them. Password `wrong` is the
   * refusal; account `ghost` does not exist. Any other account is found, online
   * and not banned, under the id it was asked for. */
  await page.route('**/api/admin/users/*', async (route) => {
    if (requester(route) === null) return signedOut(route)
    const { username, password } = route.request().postDataJSON()
    const refuse = (status: number, detail: string) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ detail }) })
    if (password === 'wrong') return refuse(400, '비밀번호가 올바르지 않습니다.')
    if (username === 'ghost') return refuse(404, '해당 아이디의 계정이 없습니다. 대소문자까지 정확히 입력해 주세요.')
    const body = route.request().url().endsWith('/ban')
      ? { username, banned: true, kicked: true }
      : {
        username, online_name: `${username}-online`, avatar_url: '', admin: false, banned: false,
        online: true, created_at: '2025-01-02T03:04:05Z', last_login_at: '2026-09-01T12:00:00Z',
      }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  const paul = { rank: 20 }
  await page.route('**/api/admin/saves/*', async (route) => {
    if (requester(route) === null) return signedOut(route)
    const action = route.request().url().split('/').pop() ?? ''
    const [status, payload] = saveAdminAnswer(action, route.request().postDataJSON(), paul)
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) })
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

  // One player's TTT2 save, which the history panel reads on its own.
  await page.route('**/api/saves/players/**', async (route) => {
    const npid = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '')
    const save = overrides?.playerSave?.[npid]
    if (save === null) return asJson(route, { detail: '이 플레이어의 TTT2 세이브가 없습니다.' }, 404)
    return asJson(route, save ?? { ...PLAYER_SAVE, username: npid })
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

    // GET — the pinned notices. The backend keeps them out of the plain list
    // and serves them only here, so answering this with the posts fixture
    // would pin every fixture post twice over.
    if (new URL(url).searchParams.get('post_type') === '공지') {
      const notices = overrides?.notices ?? []
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ posts: notices, total: notices.length, page: 1, page_size: 100 }),
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

  // The lobby chat. App mounts it on every page, so without this route every
  // spec would hold an event stream open against production.
  //
  // The stream is answered with its snapshot and then ends, which an
  // EventSource treats as a drop and reconnects after `retry` ms. A day's
  // worth keeps it from reconnecting during a spec; the store's own retry is
  // for streams the browser refused, which this is not.
  const chat = [...(overrides?.chat ?? [])]
  let nextChatId = Math.max(0, ...chat.map((message) => message.id)) + 1
  await page.route('**/api/chat/**', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `retry: 86400000\nevent: snapshot\ndata: ${JSON.stringify(chat)}\n\n`,
      })
    }
    const me = requester(route)
    if (!me) return signedOut(route)
    if (method === 'POST') {
      const { body } = route.request().postDataJSON()
      const message = { id: nextChatId, author_username: me, author_online_name: me, body, created_at: new Date().toISOString() }
      nextChatId += 1
      chat.push(message)
      return asJson(route, message, 201)
    }
    const id = Number(route.request().url().match(/\/messages\/(\d+)/)?.[1])
    const index = chat.findIndex((message) => message.id === id)
    if (index < 0) return asJson(route, { detail: '메시지를 찾을 수 없습니다.' }, 404)
    if (chat[index].author_username !== me) return asJson(route, { detail: '본인 메시지만 삭제할 수 있습니다.' }, 403)
    chat.splice(index, 1)
    return route.fulfill({ status: 204, body: '' })
  })
}
