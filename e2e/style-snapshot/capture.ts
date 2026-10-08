/// <reference types="node" />
// Records the computed style of every element on a fixed list of screen states,
// so a stylesheet change can be compared before and after. See README.md.
//
// OUT=<dir> picks where the snapshots land; BASE_URL points at the build to
// record. diff.mjs compares two such directories.
import { test, expect, type Locator, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as zlib from 'node:zlib'
import { mockAllApis, reservationAt, signInAs, skipPatchNotes } from '../helpers/mock-api'
import postDetail from '../fixtures/community-post-detail.json'

const OUT = process.env.OUT
if (!OUT) throw new Error('Set OUT to the directory the snapshots go to.')

const NOW = Date.now()
const CHAT = [1, 2, 3].map((id) => ({
  id, author_username: id === 2 ? 'me' : 'rival', author_online_name: id === 2 ? 'me' : '상대',
  body: `메시지 ${id}`, created_at: new Date(NOW - (10 - id) * 60_000).toISOString(),
}))
const RESERVATIONS = [
  reservationAt(20, { id: 1, host_display_name: '모집중호스트', capacity: 4, participant_count: 1 }),
  reservationAt(21, { id: 2, host_display_name: '자리없음호스트', capacity: 2, participant_count: 2 }),
]
const MANY_RESERVATIONS = [18, 19, 20, 21, 22, 23].map((hour, i) =>
  reservationAt(hour, { id: i + 1, host_display_name: `호스트${i + 1}`, capacity: 2, participant_count: 0 }))
const FULL_RESERVATION = {
  ...reservationAt(21, { id: 1, capacity: 2, participant_count: 2, status: 'matched' }),
  participants: [{ id: 1, display_name: 'TTT2_Master', username: 'np_001' }, { id: 2, display_name: 'KingOfIronFist', username: 'np_002' }],
}
// Ranks with no banner art draw RankImage's text plate instead.
const PLATE_RESERVATION = reservationAt(20, { id: 1, host_display_name: '계급판호스트', host_ranks: ['Tekken Lord', 'Initiate', 'Yaksa'], capacity: 4, participant_count: 1 })
const MY_RESERVATION =reservationAt(21, { id: 1, host_display_name: 'me', host_username: 'me', capacity: 3, participant_count: 0 })
const NOTICE = {
  id: 77, author: 'root', title: '서버 점검 안내', body: '내일 점검합니다', post_type: '공지',
  characters: [], youtube_video_id: null, thumbs_up: 0, thumbs_down: 0,
  created_at: new Date(NOW).toISOString(), comment_count: 0,
}
const VIDEO_POST = { ...postDetail, youtube_video_id: 'dQw4w9WgXcQ' }

type Mock = Parameters<typeof mockAllApis>[1]
interface State {
  name: string
  url: string
  /** username, online name, admin */
  signIn?: [string, string?, boolean?]
  patchNotes?: boolean
  mock?: Mock
  /** Endpoints left unanswered, to hold a panel in its loading state. */
  hang?: string[]
  act?: (page: Page) => Promise<void>
  /** What must be on screen once the state is reached. A state that misses it
   * fails, rather than recording whatever screen the steps happened to leave. */
  ready: (page: Page) => Locator
}

const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' }).first()
const tabPanel = (page: Page) => page.getByRole('tabpanel').first()
const openLogin = (page: Page) => page.locator('header').getByRole('button', { name: '로그인', exact: true }).click()
const openAccountMenu = (page: Page) => page.locator('#headerProfileSlot').getByRole('button', { name: /계정 메뉴$/ }).click()

/** Both character grids start open on a screen with room for them (see
 * useCharacterPickerDefault), so a click there would close one. */
async function openCharacterPicker(page: Page) {
  const toggle = page.getByRole('button', { name: /^캐릭터 필터/ }).first()
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
}

async function lookUpSave(page: Page) {
  await page.getByLabel('내 비밀번호 (확인용)').fill('pw')
  await page.getByLabel('플레이어 아이디').fill('player1')
  await button(page, '세이브 조회').click()
  await expect(page.getByRole('region', { name: '캐릭터 목록' })).toBeVisible()
}

async function previewSave(page: Page) {
  await lookUpSave(page)
  await button(page, /^계급:/).click()
  await button(page, 'Genbu').click()
  await button(page, '미리보기').click()
}

async function lookUpAccount(page: Page) {
  await page.getByLabel('대상 RPCN 아이디').fill('Cheater')
  await page.getByLabel('내 비밀번호 (확인용)').fill('pw')
  await button(page, '조회').click()
}

async function openCreateReservation(page: Page) {
  await button(page, '+ 예약 추가').click()
  return page.getByRole('dialog', { name: '예약 추가' })
}

const STATES: State[] = [
  // The tabs, as a visitor and signed in.
  { name: 'home', url: '/', ready: (p) => p.getByRole('region', { name: '모집 중인 예약' }) },
  { name: 'home-signed-in', url: '/', signIn: ['me'], ready: (p) => p.getByRole('region', { name: '모집 중인 예약' }) },
  { name: 'home-many-reservations', url: '/', mock: { reservations: MANY_RESERVATIONS }, ready: (p) => p.getByRole('region', { name: '모집 중인 예약' }) },
  { name: 'home-notice', url: '/', mock: { notices: [NOTICE] }, ready: (p) => p.getByRole('region', { name: '공지' }) },
  { name: 'match-rank', url: '/match/rank_match', ready: (p) => p.getByRole('table') },
  { name: 'match-player', url: '/match/player_match', ready: (p) => p.getByRole('table') },
  { name: 'match-empty', url: '/match/rank_match', mock: { rooms: { rank_match: [], player_match: [] } }, ready: (p) => p.getByText(/방이 없습니다/) },
  { name: 'leaderboard', url: '/leaderboard', ready: (p) => p.getByRole('table').first() },
  { name: 'leaderboard-me', url: '/leaderboard', signIn: ['np_001', 'TTT2_Master'], ready: (p) => p.getByRole('table').first() },
  { name: 'leaderboard-char-filter', url: '/leaderboard', act: openCharacterPicker, ready: (p) => button(p, 'Jin') },
  { name: 'leaderboard-char-filtered', url: '/leaderboard', act: async (p) => {
    await openCharacterPicker(p)
    await button(p, 'Jin').click()
    await p.keyboard.press('Escape')
  }, ready: (p) => button(p, '캐릭터 필터: Jin') },
  { name: 'stats', url: '/stats', ready: (p) => p.locator('#hourly-heading') },
  { name: 'community', url: '/community', ready: (p) => button(p, /Best tag combos/) },
  { name: 'community-notice', url: '/community', mock: { notices: [NOTICE] }, ready: (p) => p.getByRole('region', { name: '공지' }) },
  { name: 'community-char-filter', url: '/community', act: openCharacterPicker, ready: (p) => p.getByRole('group', { name: '캐릭터로 거르기' }) },
  { name: 'community-char-selected', url: '/community', act: async (p) => {
    await openCharacterPicker(p)
    const picker = p.getByRole('group', { name: '캐릭터로 거르기' })
    await picker.getByRole('button', { name: 'Jin', exact: true }).click()
    await picker.getByRole('button', { name: 'Kazuya', exact: true }).click()
  }, ready: (p) => p.getByRole('group', { name: '캐릭터로 거르기' }) },
  { name: 'community-detail', url: '/community/1', ready: (p) => button(p, /목록/) },
  { name: 'community-detail-owner', url: '/community/1', signIn: ['TTT2_Master'], ready: (p) => button(p, '수정') },
  { name: 'community-delete-confirm', url: '/community/1', signIn: ['TTT2_Master'], act: (p) => button(p, '삭제').click(), ready: (p) => p.getByRole('alertdialog') },
  { name: 'community-youtube', url: '/community/1', mock: { postDetail: VIDEO_POST }, ready: (p) => p.locator('iframe[src*="youtube-nocookie"]') },
  { name: 'community-create', url: '/community', signIn: ['me'], act: (p) => button(p, '글쓰기').click(), ready: (p) => p.getByLabel('게시글 내용') },
  { name: 'community-create-near-limit', url: '/community', signIn: ['me'], act: async (p) => {
    await button(p, '글쓰기').click()
    await p.getByLabel('게시글 내용').fill('가'.repeat(950))
  }, ready: (p) => p.getByText('950 / 1,000') },
  { name: 'reservation', url: '/reservation', mock: { reservations: RESERVATIONS }, ready: (p) => button(p, /모집중호스트/) },
  { name: 'reservation-detail', url: '/reservation/1', mock: { reservations: RESERVATIONS }, ready: (p) => p.getByRole('complementary', { name: '선택한 예약 상세' }) },
  { name: 'reservation-rank-plate', url: '/reservation/1', mock: { reservations: [PLATE_RESERVATION] }, ready: (p) => p.getByRole('complementary', { name: '선택한 예약 상세' }) },
  { name: 'home-rank-plate', url: '/', mock: { reservations: [PLATE_RESERVATION] }, ready: (p) => p.getByRole('region', { name: '모집 중인 예약' }).getByText('계급판호스트') },
  { name: 'reservation-roster', url: '/reservation/1', mock: { reservations: [FULL_RESERVATION] }, ready: (p) => p.getByRole('region', { name: '참가자 명단' }) },
  { name: 'reservation-host', url: '/reservation/1', signIn: ['me'], mock: { reservations: [MY_RESERVATION] }, ready: (p) => button(p, '예약 삭제') },
  { name: 'reservation-delete-confirm', url: '/reservation/1', signIn: ['me'], mock: { reservations: [MY_RESERVATION] },
    act: (p) => button(p, '예약 삭제').click(), ready: (p) => p.getByRole('alertdialog', { name: '예약을 삭제할까요?' }) },
  { name: 'reservation-create', url: '/reservation', signIn: ['me'], act: async (p) => { await openCreateReservation(p) },
    ready: (p) => p.getByRole('dialog', { name: '예약 추가' }) },
  { name: 'reservation-rank-picker', url: '/reservation', signIn: ['me'], act: async (p) => {
    const modal = await openCreateReservation(p)
    await modal.getByRole('button', { name: '계급 선택' }).click()
  }, ready: (p) => p.locator('#reservation-rank-picker') },
  { name: 'reservation-time-picker', url: '/reservation', signIn: ['me'], act: async (p) => {
    const modal = await openCreateReservation(p)
    await modal.getByRole('button', { name: /시작 시각/ }).click()
  }, ready: (p) => p.getByRole('dialog', { name: '시간 선택' }) },
  { name: 'admin', url: '/admin', signIn: ['root', '운영자', true], ready: (p) => p.getByLabel('대상 RPCN 아이디') },
  { name: 'admin-account', url: '/admin', signIn: ['root', '운영자', true], act: lookUpAccount, ready: (p) => p.getByRole('region', { name: '조회한 계정' }) },
  { name: 'admin-ban-confirm', url: '/admin', signIn: ['root', '운영자', true], act: async (p) => {
    await lookUpAccount(p)
    await p.getByRole('region', { name: '조회한 계정' }).getByRole('button', { name: '밴' }).click()
  }, ready: (p) => p.getByRole('alertdialog') },
  { name: 'admin-save', url: '/admin', signIn: ['root', '운영자', true], act: lookUpSave, ready: (p) => p.getByRole('region', { name: '캐릭터 목록' }) },
  { name: 'admin-save-rank-picker', url: '/admin', signIn: ['root', '운영자', true], act: async (p) => {
    await lookUpSave(p)
    await button(p, /^계급:/).click()
  }, ready: (p) => button(p, 'Genbu') },
  { name: 'admin-save-preview', url: '/admin', signIn: ['root', '운영자', true], act: previewSave, ready: (p) => p.getByRole('region', { name: '미리보기', exact: true }) },
  { name: 'admin-save-confirm', url: '/admin', signIn: ['root', '운영자', true], act: async (p) => {
    await previewSave(p)
    await p.getByRole('region', { name: '미리보기', exact: true }).getByRole('button', { name: '적용', exact: true }).click()
  }, ready: (p) => p.getByRole('alertdialog') },
  { name: 'history', url: '/leaderboard', act: (p) => button(p, 'TTT2_Master').click(), ready: (p) => p.locator('#history-title') },
  { name: 'history-partner', url: '/leaderboard', act: async (p) => {
    await button(p, 'TTT2_Master').click()
    await p.locator('.history-partner-row').first().click()
  }, ready: (p) => button(p, /np_001/) },
  { name: 'history-save', url: '/leaderboard', act: async (p) => {
    await button(p, 'TTT2_Master').click()
    await p.getByRole('dialog').getByRole('tab', { name: '캐릭터별 계급' }).click()
  }, ready: (p) => p.getByRole('dialog').getByRole('region', { name: '캐릭터별 계급' }) },
  { name: 'login-dialog', url: '/', act: openLogin, ready: (p) => p.getByRole('dialog', { name: 'RPCN 로그인' }) },
  { name: 'login-focus-close', url: '/', act: async (p) => {
    await openLogin(p)
    await p.getByRole('button', { name: '로그인 창 닫기' }).focus()
    await p.keyboard.press('Shift+Tab')
    await p.keyboard.press('Tab')
  }, ready: (p) => p.getByRole('button', { name: '로그인 창 닫기' }) },
  { name: 'login-hover-close', url: '/', act: async (p) => {
    await openLogin(p)
    await p.getByRole('button', { name: '로그인 창 닫기' }).hover()
  }, ready: (p) => p.getByRole('button', { name: '로그인 창 닫기' }) },
  { name: 'account-menu', url: '/', signIn: ['me'], act: openAccountMenu, ready: (p) => p.getByRole('menuitem', { name: '로그아웃' }) },
  { name: 'logout-confirm', url: '/', signIn: ['me'], act: async (p) => {
    await openAccountMenu(p)
    await p.getByRole('menuitem', { name: '로그아웃' }).click()
  }, ready: (p) => p.getByRole('alertdialog', { name: '로그아웃할까요?' }) },
  { name: 'patch-notes', url: '/', patchNotes: true, ready: (p) => p.locator('[aria-labelledby="patch-notes-title"]') },
  { name: 'hover-nav-tab', url: '/', act: (p) => p.getByRole('tab', { name: '리더보드' }).hover(), ready: (p) => p.getByRole('tab', { name: '리더보드' }) },
  { name: 'error-rooms', url: '/match/rank_match', mock: { failEndpoints: ['rooms'] }, ready: (p) => button(p, '다시 시도') },
  { name: 'error-leaderboard', url: '/leaderboard', mock: { failEndpoints: ['leaderboard'] }, ready: (p) => button(p, '다시 시도') },
  { name: 'loading-home', url: '/', hang: ['**/api/history/stats**', '**/api/reservations**', '**/api/community/**'], ready: tabPanel },
  { name: 'loading-match', url: '/match/rank_match', hang: ['**/api/rooms/all**'], ready: tabPanel },
  { name: 'loading-leaderboard', url: '/leaderboard', hang: ['**/api/leaderboard**'], ready: tabPanel },
  { name: 'loading-community', url: '/community', hang: ['**/api/community/**'], ready: tabPanel },
  { name: 'loading-reservation', url: '/reservation', hang: ['**/api/reservations**'], ready: tabPanel },
  { name: 'loading-stats', url: '/stats', hang: ['**/api/history/stats**'], ready: tabPanel },
  { name: 'chat-open', url: '/', signIn: ['me'], mock: { chat: CHAT }, act: async (p) => {
    const launcher = p.getByRole('button', { name: /^채팅 열기/ })
    if (await launcher.isVisible()) await launcher.click()
  }, ready: (p) => p.getByRole('log', { name: '채팅 메시지' }) },
  { name: 'chat-empty', url: '/', mock: { chat: [] }, act: async (p) => {
    const launcher = p.getByRole('button', { name: /^채팅 열기/ })
    if (await launcher.isVisible()) await launcher.click()
  }, ready: (p) => p.getByRole('region', { name: '채팅' }) },
]

/** Land every CSS transition on its end state and park infinite loops at their
 * start, so two runs read the same frame. Recharts draws its lines in JS over
 * 1.5s, which only waiting covers. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1600)
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      const infinite = animation.effect?.getTiming().iterations === Infinity
      if (infinite) { animation.pause(); animation.currentTime = 0 } else animation.finish()
    }
  })
}

/** Every element keyed by its tag/nth-child path, with ::before/::after when
 * they render, and its class list so a difference can be traced to markup. */
function capture() {
  const keyOf = (el: Element): string => {
    const parts: string[] = []
    for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
      const index = n.parentElement ? Array.prototype.indexOf.call(n.parentElement.children, n) : 0
      parts.push(`${n.tagName.toLowerCase()}:${index}`)
    }
    return parts.reverse().join('>')
  }
  // One colour can serialise as rgb(), color(srgb …) or oklab(…) depending on
  // whether a sheet or a utility mixed it; paint it to compare the pixel.
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const painted = new Map<string, string>()
  const paint = (colour: string) => {
    const known = painted.get(colour)
    if (known) return known
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = colour
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    painted.set(colour, `rgba(${r},${g},${b},${a})`)
    return painted.get(colour)!
  }
  const COLOUR = /(?:rgba?|color|oklab|oklch|lab|lch|hsla?|hwb)\([^()]*\)/g
  const serialise = (style: CSSStyleDeclaration) => {
    const out: string[] = []
    for (let i = 0; i < style.length; i++) out.push(`${style[i]}:${style.getPropertyValue(style[i]).replace(COLOUR, paint)}`)
    return out.join(';')
  }
  const rows: [string, string, string][] = []
  for (const el of document.querySelectorAll('body, body *')) {
    const key = keyOf(el)
    const cls = el.getAttribute('class') ?? ''
    rows.push([key, serialise(getComputedStyle(el)), cls])
    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(el, pseudo)
      if (style.content !== 'none' && style.content !== 'normal') rows.push([key + pseudo, serialise(style), cls])
    }
  }
  return rows
}

async function reach(page: Page, state: State) {
  await mockAllApis(page, state.mock)
  for (const pattern of state.hang ?? []) await page.route(pattern, () => {})
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<body>Player</body>' }))
  if (!state.patchNotes) await skipPatchNotes(page)
  if (state.signIn) await signInAs(page, ...state.signIn)
  await page.goto(state.url)
  if (state.act) await state.act(page)
  await expect(state.ready(page)).toBeVisible()
}

for (const state of STATES) {
  test(state.name, async ({ page }, info) => {
    await reach(page, state)
    await settle(page)
    const rows = await page.evaluate(capture)
    const dir = path.join(OUT, info.project.name)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, `${state.name}.json.gz`), zlib.gzipSync(JSON.stringify(rows)))
  })
}
