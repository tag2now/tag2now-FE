import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LeaderboardViews from '@/shared/LeaderboardViews'
import type { PolledState } from '@/shared/hooks/usePolledData'
import type { LeaderboardData } from '@/shared/types'

const board = (names: string[]): LeaderboardData => ({
  total_records: names.length,
  entries: names.map((online_name, i) => ({ np_id: `np_${online_name}`, rank: i + 1, online_name })),
})

const polled = (data: LeaderboardData | null, error: string | null = null): PolledState<LeaderboardData> =>
  ({ data, loading: false, refreshing: false, error, refresh: vi.fn(), lastUpdated: null })

let path = ''
function Probe() {
  path = useLocation().pathname
  return null
}

async function renderAt(url: string, current = polled(board(['NowPlayer']))) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/leaderboard/:view?" element={<LeaderboardViews current={current} best={polled(board(['BestPlayer', 'NowPlayer']))} />} />
        </Routes>
        <Probe />
      </MemoryRouter>,
    )
  })
}

const names = () => Array.from(document.querySelectorAll('.player-btn')).map((b) => b.textContent)

describe('LeaderboardViews', () => {
  it('opens on current ranks', async () => {
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
    await renderAt('/leaderboard', polled(null, 'Current rank fetch failed: 502'))
    expect(screen.getByText('Current rank fetch failed: 502')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '최고 계급' })).toBeInTheDocument()
  })
})
