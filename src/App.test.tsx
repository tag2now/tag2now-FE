import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import App from "@/App";

// Create stable mock functions accessible inside vi.mock factories
const { mockedFetchLeaderboard, mockedFetchRoomsAll } = vi.hoisted(() => ({
  mockedFetchLeaderboard: vi.fn(),
  mockedFetchRoomsAll: vi.fn(),
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

/** 개요 is now the landing tab, so a test about a room, the leaderboard, or the
 * reservation tab has to get there first. */
async function renderApp(tab?: string) {
  await act(async () => {
    render(<App />)
  })
  if (!tab) return
  await act(async () => {
    fireEvent.click(screen.getByRole('tab', { name: tab }))
  })
}

beforeEach(() => {
  mockedFetchLeaderboard.mockResolvedValue(LEADERBOARD_DATA as any)
  mockedFetchRoomsAll.mockResolvedValue(ROOMS_DATA as any)
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
      const result = render(<App />)
      unmount = result.unmount
    })

    unmount!()

    // Rooms is the one App-level poll; the leaderboard passes a null interval
    // and never registers one. The overview — now the default tab — fetches
    // once without polling, and reservation's interval only runs while that tab
    // is mounted.
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
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

    await renderApp()

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '예약' }))
    })

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
      render(<App />)
    })

    // Switch to Leaderboard tab to see the error
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '리더보드' }))
    })

    await waitFor(() => {
      expect(screen.getByText('Leaderboard fetch failed: 500')).toBeInTheDocument()
    })
  })
})
