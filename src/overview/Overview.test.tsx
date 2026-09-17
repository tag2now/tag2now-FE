import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Overview from '@/overview/Overview'
import type { OverviewData } from '@/overview/types'
import type { RoomsData } from '@/match/types'
import type { LeaderboardEntry } from '@/shared/types'

const { mockedUseOverview, mockedGet } = vi.hoisted(() => ({
  mockedUseOverview: vi.fn(),
  mockedGet: vi.fn(),
}))

// The history panel fetches on open; without this its request escapes the test.
vi.mock('@/shared/util/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/util/api')>('@/shared/util/api')
  return { ...actual, GET: mockedGet }
})

vi.mock('@/overview/useOverview', async () => {
  const actual = await vi.importActual<typeof import('@/overview/useOverview')>('@/overview/useOverview')
  return { ...actual, default: mockedUseOverview }
})

// Recharts measures its container, which jsdom reports as 0x0 and then renders
// nothing. Fixing the size keeps the chart out of the assertions' way.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  }
})

const OVERVIEW_DATA: OverviewData = {
  daily: [
    { date: '2026-08-31', peak_players: 40, avg_players: 20, unique_players: 128 },
    { date: '2026-09-01', peak_players: 55, avg_players: 30, unique_players: 172 },
  ],
  weeklyTop: [
    { npid: 'w1', online_name: 'WeeklyOne', match_count: 120 },
    { npid: 'w2', online_name: 'WeeklyTwo', match_count: 80 },
  ],
  posts: [
    { id: 1, author: 'PostAuthor', title: '첫 게시글', body: '', post_type: 'free', characters: [], thumbs_up: 3, thumbs_down: 0, created_at: new Date().toISOString(), comment_count: 2 },
  ],
  reservations: [
    // Ranks out of order and three of them, so the row has to sort and to
    // count what it cannot fit rather than simply printing the list.
    { id: 1, start_at: '2026-09-02T12:00:00Z', host_display_name: 'HostOne', host_ranks: ['Master', 'Raijin', 'Fujin'], match_type: 'rank_match', capacity: 4, memo: '', status: 'open', participant_count: 1, created_at: '2026-09-02T09:00:00Z' },
    { id: 2, start_at: '2026-09-02T13:00:00Z', host_display_name: 'HostFull', host_ranks: [], match_type: 'any', capacity: 2, memo: '', status: 'open', participant_count: 2, created_at: '2026-09-02T09:00:00Z' },
    { id: 3, start_at: '2026-09-02T14:00:00Z', host_display_name: 'HostPlayer', host_ranks: [], match_type: 'player_match', capacity: 3, memo: '', status: 'open', participant_count: 0, created_at: '2026-09-02T09:00:00Z' },
  ],
}

const ROOMS: RoomsData = {
  total: 3,
  totalUsers: 7,
  groups: {
    rank_match: [{ room_id: 'r1', users: [] }, { room_id: 'r2', users: [] }],
    player_match: [{ room_id: 'r3', users: [] }],
  },
}

const ENTRIES: LeaderboardEntry[] = [
  { np_id: 'p1', rank: 1, online_name: 'TopPlayer', player_info: { main_char_info: { name: 'Jin', rank_info: { name: 'Destroyer', tier: '주황단' } }, sub_char_info: { name: 'Heihachi', rank_info: { name: 'Vanquisher', tier: '주황단' } } } },
  { np_id: 'p2', rank: 2, online_name: 'SecondPlayer', player_info: null },
]

/** A KPI card is identified by its label; asserting on the bare number would
 * collide with any other figure that happens to match.
 *
 * The label is matched inside `.kpi-card-label` rather than anywhere on the
 * page: a card's label is a word the sections below it use too, and a bare
 * getByText then finds several. */
function kpiCard(label: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('.kpi-card')]
    .filter((card) => card.querySelector('.kpi-card-label')?.textContent === label)
  if (found.length !== 1) throw new Error(`expected one KPI card labelled "${label}", found ${found.length}`)
  return found[0]
}

function kpiValue(label: string): string | null {
  return kpiCard(label).querySelector('.kpi-card-value')?.textContent ?? null
}

/** The whole card is the link, so its href is what the tile does. */
function kpiHref(label: string): string | null {
  return kpiCard(label).closest('a')?.getAttribute('href') ?? null
}

function polled(data: OverviewData | null, over: Partial<{ loading: boolean; refreshing: boolean; error: string | null; refresh: () => void }> = {}) {
  return { data, loading: false, refreshing: false, error: null, lastUpdated: null, refresh: vi.fn(), ...over }
}

// The section links and the list rows are real links now, so the panel needs a
// router around it even for the tests that never navigate.
function renderOverview(props: Partial<React.ComponentProps<typeof Overview>> = {}) {
  return render(
    <MemoryRouter>
      <Overview
        rooms={ROOMS}
        roomsLoading={false}
        leaderboardEntries={ENTRIES}
        leaderboardTotal={512}
        {...props}
      />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockedUseOverview.mockReturnValue(polled(OVERVIEW_DATA))
  mockedGet.mockResolvedValue({ npid: 'p1', days_active: 3, times_seen: 12, first_seen: '2026-08-01', last_seen: '2026-09-01', room_type_counts: {}, top_played_with: [], active_hours: [] })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('Overview', () => {
  it('announces the first load and reserves the card heights', () => {
    mockedUseOverview.mockReturnValue(polled(null, { loading: true }))
    renderOverview()
    expect(screen.getByRole('status')).toHaveTextContent('현황을 불러오는 중')
    expect(document.querySelectorAll('.skeleton-card').length).toBeGreaterThan(1)
  })

  it('shows the error and a retry control when the fetch fails', () => {
    const refresh = vi.fn()
    mockedUseOverview.mockReturnValue(polled(null, { error: 'boom', refresh }))
    renderOverview()

    expect(screen.getByText('boom')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /다시 시도/ }))
    expect(refresh).toHaveBeenCalledOnce()
  })

  // A refresh replaces data the page is already showing, so nothing moves
  // while the four requests are out. The button is the only thing that can say
  // the click landed, and blocking it also stops a second click piling on.
  it('blocks the refresh control while a refresh is in flight', () => {
    mockedUseOverview.mockReturnValue(polled(OVERVIEW_DATA, { refreshing: true }))
    renderOverview()

    expect(screen.getByRole('button', { name: '새로고침' })).toBeDisabled()
  })

  it('leaves the refresh control takeable once the data has settled', () => {
    renderOverview()

    expect(screen.getByRole('button', { name: '새로고침' })).toBeEnabled()
  })

  // One card for the rooms, not two. "접속자" and "활성 방" printed the same
  // number whenever every room held one player, which is most of the time.
  it('renders live room KPIs from props rather than fetching them', () => {
    renderOverview()

    expect(kpiValue('지금 접속')).toBe('7')
    expect(screen.getByText('방 3개 · 랭매 2 · 플매 1')).toBeInTheDocument()
    expect(document.querySelector('.kpi-grid')?.textContent).not.toContain('활성 방')
  })

  // The list shows the soonest few; the remainder row says how many it left
  // out. Without it the page simply stopped after three rows and gave the
  // reader no way to tell a short list from a truncated one.
  it('says how many reservations the list could not fit', () => {
    mockedUseOverview.mockReturnValue(polled({
      ...OVERVIEW_DATA,
      reservations: [1, 2, 3, 4, 5].map((id) => ({
        id, start_at: `2026-09-02T1${id}:00:00Z`, host_display_name: `Host${id}`, host_ranks: [],
        match_type: 'any' as const, capacity: 2, memo: '', status: 'open' as const,
        participant_count: 0, created_at: '2026-09-02T09:00:00Z',
      })),
    }))
    renderOverview()

    // Five joinable, two shown.
    const more = screen.getByRole('link', { name: '외 3건 더 보기' })
    expect(more).toHaveAttribute('href', '/reservation')
  })

  // Nothing is being hidden when the list is not truncated, so nothing says so.
  it('adds no remainder row when the list holds every reservation', () => {
    renderOverview()

    expect(screen.queryByText(/건 더 보기$/)).not.toBeInTheDocument()
  })

  // The reservation count moved off this row: the section directly below it is
  // 모집 중인 예약, listing those same reservations with their times and their
  // free seats, so the card was the weaker copy of a fact already on screen.
  it('heads the row with the registered total rather than repeating the reservation section', () => {
    renderOverview()

    expect(kpiValue('등록 플레이어')).toBe('512')
    expect(kpiHref('등록 플레이어')).toBe('/leaderboard')
    expect(kpiCard('등록 플레이어').textContent).toContain('리더보드에 오른 플레이어')
    // The section below still carries it; the KPI row does not.
    expect(document.querySelector('.kpi-grid')?.textContent).not.toContain('모집 중인 예약')
  })

  // The leaderboard is polled by App and arrives after the first paint, so the
  // card has to say "not yet" rather than "0" — a registered total of zero is
  // a claim about the site, not a loading state.
  it('shows a dash rather than zero before the leaderboard lands', () => {
    renderOverview({ leaderboardTotal: undefined })

    expect(kpiValue('등록 플레이어')).toBe('—')
  })

  // Nothing caught the h1-to-h3 gap that opened when .content-heading and its
  // h2 were removed, because every heading assertion here matched on the name
  // and never the level. Screen-reader users navigate this outline.
  it('nests its headings without skipping a level', () => {
    renderOverview()

    expect(screen.getByRole('heading', { name: '한눈에 보기', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '모집 중인 예약', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '최근 7일 접속자 추이', level: 3 })).toBeInTheDocument()
  })

  // Every card on this page summarises a tab and opens it. The KPI row was the
  // one place that stated a figure and left the reader to find its tab alone.
  it('opens the tab each KPI is drawn from', () => {
    renderOverview()

    expect(kpiHref('지금 접속')).toBe('/match/rank_match')
    expect(kpiHref('오늘 접속자')).toBe('/stats')
    expect(kpiHref('등록 플레이어')).toBe('/leaderboard')
  })

  // The card's own text says what the number is, never where it leads, so the
  // destination is appended to the accessible name. Appended, not set as an
  // aria-label: a label replaces the content it is put on, and the hint is the
  // only place the per-group breakdown appears — naming the destination that
  // way cost a screen reader the whole card body.
  it('names the destination without dropping the card content', () => {
    renderOverview()

    const card = screen.getByRole('link', { name: /지금 접속/ })
    expect(card).toHaveAccessibleName(/방 3개 · 랭매 2 · 플매 1/)
    expect(card).toHaveAccessibleName(/매치 탭으로 이동$/)
  })

  // fetchRoomsAll shuffles the groups, so a destination read from the payload
  // would move between polls. Same reversal the breakdown test uses.
  it('keeps the room KPIs on one tab when the payload reorders the groups', () => {
    renderOverview({
      rooms: { ...ROOMS, groups: { player_match: ROOMS.groups.player_match, rank_match: ROOMS.groups.rank_match } },
    })

    expect(kpiHref('지금 접속')).toBe('/match/rank_match')
  })

  it('orders the room breakdown regardless of the shuffled payload', () => {
    // fetchRoomsAll shuffles the groups; the KPI hint must not reorder with it.
    renderOverview({
      rooms: { ...ROOMS, groups: { player_match: ROOMS.groups.player_match, rank_match: ROOMS.groups.rank_match } },
    })
    expect(screen.getByText('방 3개 · 랭매 2 · 플매 1')).toBeInTheDocument()
  })

  it('shows an em dash rather than zero while rooms are still loading', () => {
    renderOverview({ rooms: null, roomsLoading: true })
    expect(screen.getByText('불러오는 중')).toBeInTheDocument()
    expect(kpiValue('지금 접속')).toBe('—')
  })

  it("reports today's unique players against yesterday, not the concurrent peak", () => {
    renderOverview()
    expect(kpiValue('오늘 접속자')).toBe('172')
    expect(screen.getByText('어제 128명')).toBeInTheDocument()
  })

  it('shows an em dash when today has no unique-player count', () => {
    mockedUseOverview.mockReturnValue(polled({
      ...OVERVIEW_DATA,
      daily: [{ date: '2026-09-01', peak_players: 47, avg_players: 18 }],
    }))

    renderOverview()

    expect(kpiValue('오늘 접속자')).toBe('—')
    expect(screen.getByText('접속 기록 없음')).toBeInTheDocument()
  })

  it('lists the top leaderboard entries with their character portraits', () => {
    renderOverview()

    expect(screen.getByText('TopPlayer')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Jin' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Destroyer' })).toBeInTheDocument()
  })

  it('shows a dash for a player with no character on record', () => {
    // SecondPlayer carries player_info: null, so both cells fall back rather
    // than collapsing the row's columns.
    renderOverview()

    const row = screen.getByText('SecondPlayer').closest('.rank-row')
    expect(row?.querySelectorAll('.mini-char.is-empty')).toHaveLength(2)
  })

  it('renders main before sub, which the narrow layout positions by order', () => {
    // Below 760px the grid places the two characters by source order
    // (:nth-child), so a swap here would silently mislabel the columns.
    renderOverview()

    const row = screen.getByText('TopPlayer').closest('.rank-row')
    // Portrait then rank inside each cell, main's pair before sub's — the
    // reading order the leaderboard's CharCell uses.
    const chars = row!.querySelectorAll('.mini-char img[alt]')
    expect(Array.from(chars).map((c) => c.getAttribute('alt'))).toEqual([
      'Jin', 'Destroyer', 'Heihachi', 'Vanquisher',
    ])
  })

  it('joins weekly players to their leaderboard characters by npid', () => {
    mockedUseOverview.mockReturnValue(polled({
      ...OVERVIEW_DATA,
      weeklyTop: [{ npid: 'p1', online_name: 'TopPlayer', match_count: 42 }],
    }))
    renderOverview()

    const row = screen.getByText('42판').closest('.rank-row')
    expect(row?.querySelector('img[alt="Jin"]')).toBeInTheDocument()
  })

  it('lists weekly top players with their match counts', () => {
    renderOverview()
    expect(screen.getByText('WeeklyOne')).toBeInTheDocument()
    expect(screen.getByText('120판')).toBeInTheDocument()
  })

  it('omits a reservation that is already full', () => {
    renderOverview()
    expect(screen.getByText('HostOne')).toBeInTheDocument()
    expect(screen.queryByText('HostFull')).not.toBeInTheDocument()
  })

  // Which ranks the host holds is what decides whether a reader can be matched
  // against them at all, so the summary row is not useful without it.
  it('shows the host ranks highest-first, counting the ones that do not fit', () => {
    renderOverview()
    const row = screen.getByRole('link', { name: /HostOne/ })

    expect([...row.querySelectorAll('img')].map((img) => img.getAttribute('alt'))).toEqual(['Raijin', 'Fujin'])
    expect(screen.getByLabelText('추가 계급 1개')).toBeInTheDocument()
  })

  // Not an empty rank strip but no strip at all: the row already says
  // "플레이어 매치" on the line under the host, and a second element saying the
  // same thing would spend width the name needs on a phone.
  it('renders no rank strip for a player match', () => {
    renderOverview()
    const row = screen.getByRole('link', { name: /HostPlayer/ })

    expect(row.querySelector('img')).toBeNull()
  })

  // A bare time cannot say whether 01:00 is tonight or the night after.
  it('names the day each reservation starts on', () => {
    vi.setSystemTime(new Date('2026-09-02T11:00:00Z'))  // 20:00 KST, before HostOne's 21:00
    renderOverview()

    expect(screen.getByRole('link', { name: /HostOne/ })).toHaveTextContent('오늘 21:00')
  })

  // The reservation and post cards share a grid row, so a third item in either
  // would set the height of both; the rest are a click away on the tab — and
  // the remainder row is what says how many that is, so it is a third listitem
  // rather than a fourth reservation.
  it('shows at most two open reservations, then says how many are left', () => {
    const open = OVERVIEW_DATA.reservations[0]
    mockedUseOverview.mockReturnValue(polled({
      ...OVERVIEW_DATA,
      reservations: [1, 2, 3].map((id) => ({ ...open, id, host_display_name: `Host${id}` })),
    }))
    renderOverview()

    const card = within(screen.getByRole('region', { name: '모집 중인 예약' }))
    expect(card.getAllByRole('link', { name: /Host/ })).toHaveLength(2)
    expect(card.getByRole('link', { name: '외 1건 더 보기' })).toBeInTheDocument()
  })

  it('shows the latest community posts', () => {
    renderOverview()
    expect(screen.getByText('첫 게시글')).toBeInTheDocument()
    expect(screen.getByText(/PostAuthor/)).toBeInTheDocument()
  })

  // Exact names, not a substring match: a KPI card names the same tab in its
  // own accessible name, so /리더보드/ now finds two links and picks neither.
  it('links each section to the tab it summarises', () => {
    renderOverview()

    expect(screen.getByRole('link', { name: '리더보드' })).toHaveAttribute('href', '/leaderboard')
    expect(screen.getByRole('link', { name: '커뮤니티' })).toHaveAttribute('href', '/community')
  })

  // The row is the link, not just the title: a reader aiming at the comment
  // count still means "open this post", and the same holds for a reservation's
  // participant figure.
  it('links a post row to that post', () => {
    renderOverview()

    // POSTS[0] is id 1; the row's accessible name carries the title.
    expect(screen.getByRole('link', { name: /첫 게시글/ })).toHaveAttribute('href', '/community/1')
  })

  it('links a reservation row to that reservation', () => {
    renderOverview()

    expect(screen.getByRole('link', { name: /HostOne/ })).toHaveAttribute('href', '/reservation/1')
  })

  it('opens the player history panel from a name in either list', async () => {
    renderOverview()

    fireEvent.click(screen.getByRole('button', { name: 'TopPlayer' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledWith('history/players/p1', expect.anything())

    // A weekly-top player is identified by the same npid the join uses, so the
    // panel opens for someone the leaderboard may not carry.
    fireEvent.click(screen.getByRole('button', { name: '플레이어 기록 닫기' }))
    fireEvent.click(screen.getByRole('button', { name: 'WeeklyOne' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledWith('history/players/w1', expect.anything())
  })

  it('renders each card empty rather than failing when a source returned nothing', () => {
    mockedUseOverview.mockReturnValue(polled({ daily: [], weeklyTop: [], posts: [], reservations: [] }))
    // The leaderboard card reads props, not useOverview, so emptying the four
    // fetched sources alone leaves it populated and "each card" untested.
    renderOverview({ leaderboardEntries: [] })

    expect(screen.getByText('게시글 없음')).toBeInTheDocument()
    expect(screen.getByText('모집 중인 예약 없음')).toBeInTheDocument()
    // Each list names what is missing rather than sharing one "데이터 없음",
    // which said nothing about which card the reader was looking at.
    expect(screen.getByText('리더보드 순위 없음')).toBeInTheDocument()
    expect(screen.getByText('주간 기록 없음')).toBeInTheDocument()
    // The two cards a reader can act on also say where to go next.
    expect(screen.getByText('예약 탭에서 새 약속을 만들 수 있습니다')).toBeInTheDocument()
    expect(screen.getByText('커뮤니티 탭에서 첫 글을 남겨보세요')).toBeInTheDocument()
  })
})
