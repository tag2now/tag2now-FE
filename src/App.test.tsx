import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import App from "@/App";

// Create stable mock functions accessible inside vi.mock factories
const { mockedFetchLeaderboard, mockedFetchRoomsAll } = vi.hoisted(() => ({
  mockedFetchLeaderboard: vi.fn(),
  mockedFetchRoomsAll: vi.fn(),
}))

vi.mock('@/shared/hook/useLeaderboard', async () => {
  const { default: usePolledData } = await vi.importActual<typeof import('@/shared/hooks/usePolledData')>('@/shared/hooks/usePolledData')
  return {
    fetchLeaderboard: mockedFetchLeaderboard,
    default: () => usePolledData(mockedFetchLeaderboard as any, null),
  }
})

vi.mock('@/match/useRooms', async () => {
  const { default: usePolledData } = await vi.importActual<typeof import('@/shared/hooks/usePolledData')>('@/shared/hooks/usePolledData')
  return {
    fetchRoomsAll: mockedFetchRoomsAll,
    default: () => usePolledData(mockedFetchRoomsAll as any, 10_000),
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

async function renderApp() {
  await act(async () => {
    render(<App />)
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

  it('default tab is first room group and shows rooms content', async () => {
    await renderApp()

    expect(screen.getByText('랭매 (1)')).toBeInTheDocument()
    expect(screen.getByText('RoomOwner')).toBeInTheDocument()
    expect(screen.queryByText('TestPlayer')).not.toBeInTheDocument()
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
    await renderApp()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
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
      fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    })

    expect(mockedFetchLeaderboard).toHaveBeenCalledTimes(2)
    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(1)
  })

  it('auto-refresh: rooms refresh every 10s, leaderboard does not auto-refresh', async () => {
    vi.useFakeTimers()

    await renderApp()

    expect(mockedFetchLeaderboard).toHaveBeenCalledTimes(1)
    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(1)

    // After 10s: rooms refreshes, leaderboard does not
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })

    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(2)
    expect(mockedFetchLeaderboard).toHaveBeenCalledTimes(1)

    // After 60s total: rooms has refreshed 6 times + 1 mount, leaderboard still at 1
    await act(async () => {
      vi.advanceTimersByTime(50_000)
    })

    expect(mockedFetchRoomsAll).toHaveBeenCalledTimes(7)
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

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    clearIntervalSpy.mockRestore()
  })

  it('renders app title and online user count', async () => {
    await renderApp()

    expect(screen.getByRole('heading', { name: 'Tag 2 Now' })).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText(/2 online/)).toBeInTheDocument()
  })

  it('shows loading state initially when fetch is slow', async () => {
    // Make fetch never resolve during this test
    mockedFetchLeaderboard.mockReturnValue(new Promise(() => {}))
    mockedFetchRoomsAll.mockReturnValue(new Promise(() => {}))

    render(<App />)

    expect(screen.getByText('Loading rooms...')).toBeInTheDocument()
  })

  it('auto-refresh keeps content visible and shows loading bar instead of loading message', async () => {
    vi.useFakeTimers()

    await renderApp()

    // Data is visible after initial load
    expect(screen.getByText('RoomOwner')).toBeInTheDocument()
    expect(screen.queryByText('Loading rooms...')).not.toBeInTheDocument()

    // Make the next fetch hang so we can observe the refreshing state
    mockedFetchRoomsAll.mockReturnValue(new Promise(() => {}))

    // Trigger auto-refresh
    await act(async () => {
      vi.advanceTimersByTime(10_000)
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
      expect(screen.getByText('Error: Leaderboard fetch failed: 500')).toBeInTheDocument()
    })
  })
})
