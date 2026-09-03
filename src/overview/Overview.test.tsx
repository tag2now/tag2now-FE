import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    { date: '2026-08-31', peak_players: 40, avg_players: 20 },
    { date: '2026-09-01', peak_players: 55, avg_players: 30 },
  ],
  weeklyTop: [
    { npid: 'w1', online_name: 'WeeklyOne', match_count: 120 },
    { npid: 'w2', online_name: 'WeeklyTwo', match_count: 80 },
  ],
  posts: [
    { id: 1, author: 'PostAuthor', title: '첫 게시글', body: '', post_type: 'free', thumbs_up: 3, thumbs_down: 0, created_at: new Date().toISOString(), comment_count: 2 },
  ],
  reservations: [
    { id: 1, start_at: '2026-09-02T12:00:00Z', duration_minutes: 60, host_display_name: 'HostOne', host_ranks: [], match_type: 'rank_match', capacity: 4, memo: '', status: 'open', participant_count: 1, created_at: '2026-09-02T09:00:00Z' },
    { id: 2, start_at: '2026-09-02T13:00:00Z', duration_minutes: 60, host_display_name: 'HostFull', host_ranks: [], match_type: 'any', capacity: 2, memo: '', status: 'open', participant_count: 2, created_at: '2026-09-02T09:00:00Z' },
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
  { np_id: 'p1', rank: 1, online_name: 'TopPlayer', player_info: { main_char_info: { name: 'Jin', rank_info: { name: 'Destroyer', tier: 'Destroyer' } }, sub_char_info: { name: 'Heihachi', rank_info: { name: 'Vanquisher', tier: 'Vanquisher' } } } },
  { np_id: 'p2', rank: 2, online_name: 'SecondPlayer', player_info: null },
]

/** A KPI card is identified by its label; asserting on the bare number would
 * collide with any other figure that happens to match. */
function kpiValue(label: string): string | null {
  const card = screen.getByText(label).closest('.kpi-card')
  return card?.querySelector('.kpi-card-value')?.textContent ?? null
}

function polled(data: OverviewData | null, over: Partial<{ loading: boolean; error: string | null; refresh: () => void }> = {}) {
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
})

describe('Overview', () => {
  it('shows loading state before the first load', () => {
    mockedUseOverview.mockReturnValue(polled(null, { loading: true }))
    renderOverview()
    expect(screen.getByText('개요 로딩 중...')).toBeInTheDocument()
  })

  it('shows the error and a retry control when the fetch fails', () => {
    const refresh = vi.fn()
    mockedUseOverview.mockReturnValue(polled(null, { error: 'boom', refresh }))
    renderOverview()

    expect(screen.getByText('boom')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /다시 시도/ }))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('renders live room KPIs from props rather than fetching them', () => {
    renderOverview()

    expect(kpiValue('접속자')).toBe('7')
    expect(kpiValue('활성 방')).toBe('3')
    expect(screen.getByText('랭매 2 · 플매 1')).toBeInTheDocument()
    expect(kpiValue('등록 플레이어')).toBe('512')
  })

  it('orders the room breakdown regardless of the shuffled payload', () => {
    // fetchRoomsAll shuffles the groups; the KPI hint must not reorder with it.
    renderOverview({
      rooms: { ...ROOMS, groups: { player_match: ROOMS.groups.player_match, rank_match: ROOMS.groups.rank_match } },
    })
    expect(screen.getByText('랭매 2 · 플매 1')).toBeInTheDocument()
  })

  it('shows an em dash rather than zero while rooms are still loading', () => {
    renderOverview({ rooms: null, roomsLoading: true })
    expect(screen.getByText('불러오는 중')).toBeInTheDocument()
    expect(kpiValue('접속자')).toBe('—')
    expect(kpiValue('활성 방')).toBe('—')
  })

  it("reports today's peak against yesterday", () => {
    renderOverview()
    expect(kpiValue('오늘 플레이 유저')).toBe('55')
    expect(screen.getByText('어제 40명')).toBeInTheDocument()
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

    const row = screen.getByText('SecondPlayer').closest('.overview-rank-row')
    expect(row?.querySelectorAll('.mini-char.is-empty')).toHaveLength(2)
  })

  it('renders main before sub, which the narrow layout positions by order', () => {
    // Below 760px the row wraps and places the two characters by source order
    // (:nth-of-type), so a swap here would silently mislabel the columns.
    renderOverview()

    const row = screen.getByText('TopPlayer').closest('.overview-rank-row')
    const chars = row!.querySelectorAll('.mini-char img[alt]')
    expect(Array.from(chars).map((c) => c.getAttribute('alt'))).toEqual([
      'Destroyer', 'Jin', 'Vanquisher', 'Heihachi',
    ])
  })

  it('joins weekly players to their leaderboard characters by npid', () => {
    mockedUseOverview.mockReturnValue(polled({
      ...OVERVIEW_DATA,
      weeklyTop: [{ npid: 'p1', online_name: 'TopPlayer', match_count: 42 }],
    }))
    renderOverview()

    const row = screen.getByText('42판').closest('.overview-rank-row')
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

  it('shows the latest community posts', () => {
    renderOverview()
    expect(screen.getByText('첫 게시글')).toBeInTheDocument()
    expect(screen.getByText(/PostAuthor/)).toBeInTheDocument()
  })

  it('links each section to the tab it summarises', () => {
    renderOverview()

    expect(screen.getByRole('link', { name: /리더보드/ })).toHaveAttribute('href', '/leaderboard')
    expect(screen.getByRole('link', { name: /커뮤니티/ })).toHaveAttribute('href', '/community')
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
    renderOverview()

    expect(screen.getByText('게시글 없음')).toBeInTheDocument()
    expect(screen.getByText('모집 중인 예약 없음')).toBeInTheDocument()
    expect(screen.getAllByText('데이터 없음').length).toBeGreaterThan(0)
  })
})
