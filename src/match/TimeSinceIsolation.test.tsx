import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MatchingOverview from '@/match/MatchingOverview'
import Rooms from '@/match/Rooms'
import PlayerMatchTable from '@/match/component/PlayerMatchTable'
import type { Room } from '@/match/types'

vi.mock('@/match/component/PlayerMatchTable', { spy: true })

describe('match update time rendering isolation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-11T00:00:00Z'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it.each(['Rooms', 'MatchingOverview'] as const)(
    '%s updates elapsed time without rendering PlayerMatchTable again',
    (view) => {
      const rooms: Room[] = [{
        room_id: 1,
        owner_online_name: 'Alice',
        users: [{ np_id: 'alice', online_name: 'Alice', avatar_url: '' }],
      }]
      const lastUpdated = new Date()

      render(view === 'Rooms'
        ? <Rooms data={{ rooms }} loading={false} error={null} groupKey="player_match" lastUpdated={lastUpdated} />
        : <MatchingOverview groups={{ player_match: rooms }} loading={false} error={null} lastUpdated={lastUpdated} />)

      expect(screen.getByRole('table', { name: 'Player match rooms' })).toBeInTheDocument()
      expect(screen.getByText('업데이트 1초 전')).toBeInTheDocument()
      const initialRenderCount = vi.mocked(PlayerMatchTable).mock.calls.length
      expect(initialRenderCount).toBeGreaterThan(0)

      for (let seconds = 1; seconds <= 3; seconds++) {
        act(() => { vi.advanceTimersByTime(1000) })

        expect(screen.getByText(`업데이트 ${seconds}초 전`)).toBeInTheDocument()
        expect(PlayerMatchTable).toHaveBeenCalledTimes(initialRenderCount)
      }
    },
  )
})
