import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LeaderboardViews from '@/shared/LeaderboardViews'
import type { PolledState } from '@/shared/hooks/usePolledData'
import type { CurrentRankLeaderboard } from '@/shared/currentRankLeaderboard'
import type { LeaderboardData } from '@/shared/types'

const { mockedGet } = vi.hoisted(() => ({ mockedGet: vi.fn() }))

vi.mock('@/shared/util/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/util/api')>()),
  GET: mockedGet,
}))

const DAY_MS = 24 * 60 * 60 * 1000

/** [username, place, days since the game last saved] */
const currentBoard = (rows: [string, number, number][]): CurrentRankLeaderboard => ({
  total: rows.length,
  entries: rows.map(([username, rank, daysAgo]) => ({
    rank, username, saved_at: new Date(Date.now() - daysAgo * DAY_MS).toISOString(), account_rank: 20, chars: [],
  })),
})

const BEST: LeaderboardData = {
  total_records: 2,
  entries: [
    { np_id: 'np_best', rank: 1, online_name: 'BestPlayer' },
    { np_id: 'np_now', rank: 2, online_name: 'NowPlayer' },
  ],
}

const polled = <T,>(data: T | null, error: string | null = null): PolledState<T> =>
  ({ data, loading: false, refreshing: false, error, refresh: vi.fn(), lastUpdated: null })

let path = ''
function Probe() {
  path = useLocation().pathname
  return null
}

async function renderAt(url: string, current = polled(currentBoard([['np_now', 1, 0]]))) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/leaderboard/:view?" element={<LeaderboardViews current={current} best={polled(BEST)} />} />
        </Routes>
        <Probe />
      </MemoryRouter>,
    )
  })
}

const names = () => Array.from(document.querySelectorAll('.player-btn')).map((b) => b.textContent)
const places = () => Array.from(document.querySelectorAll('.rank-row')).map((r) => r.querySelector('[role="cell"]')?.textContent?.trim())

describe('LeaderboardViews', () => {
  beforeEach(() => {
    mockedGet.mockReset()
  })

  it('opens on current ranks, named from the score board', async () => {
    await renderAt('/leaderboard')
    expect(screen.getByRole('tab', { name: '현재 계급' })).toHaveAttribute('aria-selected', 'true')
    expect(names()).toEqual(['NowPlayer'])
  })

  it('shows the score board only once 최고 계급 is chosen, and says so in the URL', async () => {
    await renderAt('/leaderboard')
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '최고 계급' }))
    })
    expect(path).toBe('/leaderboard/best')
    expect(screen.getByRole('tab', { name: '최고 계급' })).toHaveAttribute('aria-selected', 'true')
    expect(names()).toEqual(['BestPlayer', 'NowPlayer'])
  })

  it('opens the score board from its own path', async () => {
    await renderAt('/leaderboard/best')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'leaderboard-view-best')
    expect(names()).toEqual(['BestPlayer', 'NowPlayer'])
  })

  it('moves between the views with the arrow keys', async () => {
    await renderAt('/leaderboard')
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('tab', { name: '현재 계급' }), { key: 'ArrowRight' })
    })
    expect(path).toBe('/leaderboard/best')
    expect(screen.getByRole('tab', { name: '최고 계급' })).toHaveFocus()
  })

  it('keeps a failure of the current board inside it', async () => {
    await renderAt('/leaderboard', polled<CurrentRankLeaderboard>(null, 'Current rank fetch failed: 502'))
    expect(screen.getByText('Current rank fetch failed: 502')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '최고 계급' })).toBeInTheDocument()
  })

  it('최근 30일 asks the backend for recent players and shows its ranking as is', async () => {
    mockedGet.mockResolvedValue(currentBoard([['a', 1, 3], ['b', 1, 29], ['c', 3, 0]]))
    await renderAt('/leaderboard', polled(currentBoard([['old', 1, 40], ['a', 2, 3], ['b', 2, 29], ['c', 4, 0]])))
    expect(mockedGet).not.toHaveBeenCalled()
    expect(places()).toEqual(['1', '2', '2', '4'])

    const toggle = screen.getByRole('button', { name: '최근 30일' })
    await act(async () => {
      fireEvent.click(toggle)
    })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(mockedGet).toHaveBeenCalledExactlyOnceWith('saves/leaderboard', { top: 1000, days: 30 })
    expect(names()).toEqual(['a', 'b', 'c'])
    expect(places()).toEqual(['1', '1', '3'])
  })

  it('keeps a search when the board switches', async () => {
    await renderAt('/leaderboard')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Now' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: '최고 계급' }))
    })
    expect(screen.getByRole('searchbox')).toHaveValue('Now')
    expect(names()).toEqual(['NowPlayer'])
  })

  it('offers 최근 30일 on current ranks only', async () => {
    await renderAt('/leaderboard/best')
    expect(screen.queryByRole('button', { name: '최근 30일' })).not.toBeInTheDocument()
  })
})
