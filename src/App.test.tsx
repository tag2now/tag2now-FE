import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from "@/App";

// Create stable mock functions accessible inside vi.mock factories
const { mockedFetchLeaderboard, mockedFetchRoomsAll, mockedFetchReservations } = vi.hoisted(() => ({
  mockedFetchLeaderboard: vi.fn(),
  mockedFetchRoomsAll: vi.fn(),
  mockedFetchReservations: vi.fn(),
}))

// Overview fetches four sources of its own; these tests are about tab wiring,
// so stub the hook and keep the module's constants intact.
vi.mock('@/overview/useOverview', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/overview/useOverview')>()),
  default: () => ({ data: { daily: [], weeklyTop: [], posts: [], reservations: [] }, loading: false, refreshing: false, error: null, lastUpdated: null, refresh: vi.fn() }),
}))

const { default: usePolledData } = await vi.importActual<typeof import('@/shared/hooks/usePolledData')>('@/shared/hooks/usePolledData')
vi.mock("@/shared/hooks/useLeaderboard", async () => {
  return {
    fetchLeaderboard: mockedFetchLeaderboard,
    default: () => usePolledData(mockedFetchLeaderboard as any, null),
  }
})

// App polls reservations for the nav badge. Mock the request, not the hook, so
// countOpen still runs against real payloads.
vi.mock('@/reservation/reservationApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/reservation/reservationApi')>()),
  fetchReservations: mockedFetchReservations,
}))

vi.mock('@/match/useRooms', async () => {
  return {
    fetchRoomsAll: mockedFetchRoomsAll,
    default: () => usePolledData(mockedFetchRoomsAll as any, 5_000),
  }
})

const LEADERBOARD_DATA = {
  total_records: 1,
  entries: [
    {
      np_id: 'p1',
      rank: 1,
      online_name: 'TestPlayer',
      player_info: {
        main_char_info: { name: 'Jin', rank_info: { name: 'Destroyer', tier: 'Destroyer' } },
        sub_char_info: { name: 'Heihachi', rank_info: { name: 'Vanquisher', tier: 'Vanquisher' } },
      },
    },
  ],
} as const

const ROOMS_DATA = {
  total: 1,
  totalUsers: 2,
  groups: {
    rank_match: [
      {
        room_id: 'r1',
        owner_online_name: 'RoomOwner',
        rank_info: { id: 1, name: 'Platinum', tier: 'Platinum' },
        max_slots: 6,
        users: [
          { online_name: 'RoomOwner', np_id: 'RoomOwner' },
          { online_name: 'Challenger', np_id: 'Challenger' },
        ],
      },
    ],
  },
} as const

/** The panel is chosen by the URL, so a test can either land on a route or
 * click its way there. `tab` still clicks, which is what keeps these tests
 * about the nav widget rather than about routing. */
async function renderApp(tab?: string) {
  await act(async () => {
    render(<MemoryRouter><App /></MemoryRouter>)
  })
  if (!tab) return
  await act(async () => {
    // Anchored prefix, not the whole name: the 매칭 and 예약 tabs carry a count
    // badge, so their accessible name trails a figure that changes per fixture.
    fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${tab}`) }))
  })
}

/** Lands directly on a path, for the deep-link cases routing now makes possible. */
async function renderAt(path: string) {
  await act(async () => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  })
}

const reservation = (over: Record<string, unknown> = {}) => ({
  id: 1, start_at: '2026-01-01T12:00:00+09:00', duration_minutes: 60,
  host_display_name: 'Host', host_ranks: [], match_type: 'rank_match',
  capacity: 2, memo: '', status: 'open', participant_count: 0,
  created_at: '2026-01-01T00:00:00+09:00', ...over,
})

beforeEach(() => {
  mockedFetchLeaderboard.mockResolvedValue(LEADERBOARD_DATA as any)
  mockedFetchRoomsAll.mockResolvedValue(ROOMS_DATA as any)
  mockedFetchReservations.mockResolvedValue([reservation()] as any)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('App', () => {
  it('calls fetchLeaderboard and fetchRoomsAll on mount', async () => {
    await renderApp()

    expect(mockedFetchLeaderboard).toHaveBeenCalledOnce()
    expect(mockedFetchRoomsAll).toHaveBeenCalledOnce()
  })

  it('default tab is the overview', async () => {
    await renderApp()

    expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: '한눈에 보기' })).toBeInTheDocument()
  })

  it('the match tab shows rooms content', async () => {
    await renderApp('매칭')

    expect(screen.getByRole('tab', { name: '랭매 (1)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('RoomOwner')).toBeInTheDocument()
  })

  it('clicking Leaderboard tab switches to leaderboard view', async () => {
    await renderApp()

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '리더보드' }))
    })

    expect(screen.getByText('TestPlayer')).toBeInTheDocument()
    expect(screen.queryByText('RoomOwner')).not.toBeInTheDocument()
  })

  it('clicking Refresh on room tab calls fetchRoomsAll again', async () => {
    await renderApp('매칭')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '새로고침' }))
    })

    // Called once on mount and once on Refresh click
    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(2)
    expect(mockedFetchLeaderboard).toHaveBeenCalledTimes(1)
  })

  it('clicking Refresh on Leaderboard tab calls fetchLeaderboard again', async () => {
    await renderApp()

    // Switch to Leaderboard tab first
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '리더보드' }))
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '새로고침' }))
    })

    expect(mockedFetchLeaderboard).toHaveBeenCalledTimes(2)
    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(1)
  })

  it('auto-refresh: rooms refresh every 5s, leaderboard does not auto-refresh', async () => {
    vi.useFakeTimers()

    await renderApp()

    expect(mockedFetchLeaderboard).toHaveBeenCalledTimes(1)
    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(1)

    // After 5s: rooms refreshes, leaderboard does not
    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })

    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(2)
    expect(mockedFetchLeaderboard).toHaveBeenCalledTimes(1)

    // After 60s total: rooms has refreshed 12 times + 1 mount, leaderboard still at 1
    await act(async () => {
      vi.advanceTimersByTime(55_000)
    })

    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(13)
    expect(mockedFetchLeaderboard).toHaveBeenCalledTimes(1)
  })

  it('cleans up interval on unmount', async () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    let unmount: () => void
    await act(async () => {
      const result = render(<MemoryRouter><App /></MemoryRouter>)
      unmount = result.unmount
    })

    unmount!()

    // Two App-level polls — rooms, and reservations for the nav badge. The
    // leaderboard passes a null interval and never registers one, and the
    // overview fetches once without polling. The Reservation tab keeps its own
    // faster interval, but that one lives and dies with the tab.
    expect(clearIntervalSpy).toHaveBeenCalledTimes(2)
    clearIntervalSpy.mockRestore()
  })

  it('renders app title and online user count', async () => {
    await renderApp()

    expect(screen.getByRole('heading', { name: 'Tag 2 Now' })).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByLabelText('2명 온라인')).toHaveTextContent('2')
  })

  it('shows loading state initially when fetch is slow', async () => {
    // Make fetch never resolve during this test
    mockedFetchLeaderboard.mockReturnValue(new Promise(() => {}))
    mockedFetchRoomsAll.mockReturnValue(new Promise(() => {}))

    await renderApp('매칭')

    expect(screen.getByText('방 목록 불러오는 중...')).toBeInTheDocument()
  })

  it('auto-refresh keeps content visible and shows loading bar instead of loading message', async () => {
    vi.useFakeTimers()

    await renderApp('매칭')

    // Data is visible after initial load
    expect(screen.getByText('RoomOwner')).toBeInTheDocument()
    expect(screen.queryByText('방 목록 불러오는 중...')).not.toBeInTheDocument()

    // Make the next fetch hang so we can observe the refreshing state
    mockedFetchRoomsAll.mockReturnValue(new Promise(() => {}))

    // Trigger auto-refresh
    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })

    // Content should still be visible (not replaced by loading message)
    expect(screen.getByText('RoomOwner')).toBeInTheDocument()
    expect(screen.queryByText('Loading rooms...')).not.toBeInTheDocument()

    // Loading bar should be visible
    const panel = screen.getByText('RoomOwner').closest('.panel')
    const bar = panel!.querySelector('.loading-bar')
    expect(bar).toBeInTheDocument()
    expect(bar).not.toHaveClass('loading-bar-hidden')
  })

  it('keeps room tabs when the rooms fetch fails', async () => {
    mockedFetchRoomsAll.mockRejectedValue(new Error('NOT FOUND'))

    await renderApp('매칭')

    expect(screen.getByRole('tab', { name: '랭매 (—)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '플매 (—)' })).toBeInTheDocument()
  })

  it('does not show the rooms error on the reservation tab', async () => {
    mockedFetchRoomsAll.mockRejectedValue(new Error('NOT FOUND'))

    await renderApp('예약')

    expect(screen.queryByText('NOT FOUND')).not.toBeInTheDocument()
  })

  it('shows the rooms error inside the room tab', async () => {
    mockedFetchRoomsAll.mockRejectedValue(new Error('NOT FOUND'))

    await renderApp('매칭')

    expect(screen.getByText('NOT FOUND')).toBeInTheDocument()
  })

  it('labels a group the API omitted as empty once rooms load', async () => {
    await renderApp('매칭')

    // ROOMS_DATA carries rank_match only; player_match is a known group.
    expect(screen.getByRole('tab', { name: '플매 (0)' })).toBeInTheDocument()
  })

  it('shows error when fetchLeaderboard rejects', async () => {
    mockedFetchLeaderboard.mockRejectedValue(new Error('Leaderboard fetch failed: 500'))

    await act(async () => {
      render(<MemoryRouter><App /></MemoryRouter>)
    })

    // Switch to Leaderboard tab to see the error
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '리더보드' }))
    })

    await waitFor(() => {
      expect(screen.getByText('Leaderboard fetch failed: 500')).toBeInTheDocument()
    })
  })

  // Routing's whole point: a path selects the panel without a click, so a
  // shared link and the back button land where the URL says.
  describe('routing', () => {
    it('opens the panel the path names', async () => {
      await renderAt('/leaderboard')

      expect(screen.getByRole('tab', { name: '리더보드' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('TestPlayer')).toBeInTheDocument()
    })

    it('opens a room group from its path', async () => {
      await renderAt('/match/rank_match')

      expect(screen.getByRole('tab', { name: '랭매 (1)' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('RoomOwner')).toBeInTheDocument()
    })

    // nginx serves index.html for every path, so a typo arrives in the app
    // rather than at a 404 page; the overview is what it should find.
    it('falls back to the overview on an unknown path', async () => {
      await renderAt('/nope')

      expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('heading', { name: '한눈에 보기' })).toBeInTheDocument()
    })

    // The tab strip has to write the URL, not just read it — otherwise the back
    // button would not undo a tab click, which is half of what routing buys.
    it('clicking a tab moves the URL', async () => {
      let seen = ''
      function Probe() {
        seen = useLocation().pathname
        return null
      }
      await act(async () => {
        render(<MemoryRouter><App /><Probe /></MemoryRouter>)
      })
      expect(seen).toBe('/')

      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '리더보드' }))
      })

      expect(seen).toBe('/leaderboard')
    })
  })

  describe('nav count badges', () => {
    it('counts every room across groups on the match tab', async () => {
      mockedFetchRoomsAll.mockResolvedValue({
        total: 3, totalUsers: 6,
        groups: { rank_match: [{}, {}], player_match: [{}] },
      } as any)

      await renderApp()

      expect(await screen.findByRole('tab', { name: '매칭 방 3개' })).toBeInTheDocument()
    })

    it('counts only reservations a user can still join', async () => {
      mockedFetchReservations.mockResolvedValue([
        reservation({ id: 1 }),
        reservation({ id: 2, capacity: 2, participant_count: 2 }),  // full
        reservation({ id: 3, status: 'matched' }),                  // no longer open
        reservation({ id: 4 }),
      ] as any)

      await renderApp()

      expect(await screen.findByRole('tab', { name: '예약 모집중 2건' })).toBeInTheDocument()
    })

    it('shows no badge until the first load settles', async () => {
      // A pending fetch is not an assertion that there is nothing to see, so the
      // badge stays absent rather than claiming zero.
      mockedFetchRoomsAll.mockReturnValue(new Promise(() => {}) as any)
      mockedFetchReservations.mockReturnValue(new Promise(() => {}) as any)

      await renderApp()

      expect(screen.getByRole('tab', { name: '매칭' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '예약' })).toBeInTheDocument()
    })

    it('keeps a zero badge, which is a real answer', async () => {
      mockedFetchRoomsAll.mockResolvedValue({ total: 0, totalUsers: 0, groups: {} } as any)
      mockedFetchReservations.mockResolvedValue([] as any)

      await renderApp()

      expect(await screen.findByRole('tab', { name: '매칭 방 0개' })).toBeInTheDocument()
      expect(await screen.findByRole('tab', { name: '예약 모집중 0건' })).toBeInTheDocument()
    })
  })

})
