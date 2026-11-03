import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import { GET } from '@/shared/util/api'
import { fetchPlayerRecords } from '@/shared/matchRecordsApi'
import type { PlayerSave } from '@/shared/saveChars'
import type { PlayerRecordPage } from '@/shared/matchRecords'

vi.mock('@/shared/util/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/util/api')>('@/shared/util/api')
  return { ...actual, GET: vi.fn() }
})
vi.mock('@/shared/playerSaveApi', () => ({ fetchPlayerSave: vi.fn() }))
vi.mock('@/shared/matchRecordsApi', () => ({ fetchPlayerRecords: vi.fn(), fetchMatchRecords: vi.fn() }))

const HISTORY = { npid: 'p1', days_active: 3, times_seen: 12, first_seen: '2026-08-01', last_seen: '2026-09-01', room_type_counts: {}, top_played_with: [], active_hours: [] }
const SAVE: PlayerSave = { username: 'p1', saved_at: '2026-09-01T00:00:00Z', account_rank: 20, total: 3, wins: 2, losses: 1, chars: [] }
const RECORDS: PlayerRecordPage = {
  npid: 'p1', wins: 1, losses: 0, next_before: null,
  matches: [{
    id: 1, played_at: '2026-09-01T00:00:00Z',
    winner: { npid: 'p1', online_name: 'P1', chars: null },
    loser: { npid: 'p2', online_name: 'Rival', chars: null },
  }],
}

beforeEach(() => {
  vi.mocked(GET).mockReset().mockResolvedValue(HISTORY)
  vi.mocked(fetchPlayerSave).mockReset().mockResolvedValue(SAVE)
  vi.mocked(fetchPlayerRecords).mockReset().mockResolvedValue(RECORDS)
})

const tab = (name: string) => screen.getByRole('tab', { name })

describe('PlayerHistoryPanel tabs', () => {
  it('opens on the play history and reads the save only once its tab is chosen', async () => {
    render(<PlayerHistoryPanel npid="p1" onClose={() => {}} />)

    expect(tab('플레이 기록')).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('12회')).toBeInTheDocument()
    expect(fetchPlayerSave).not.toHaveBeenCalled()

    fireEvent.click(tab('캐릭터별 계급'))
    expect(await screen.findByText('3판 2승 1패')).toBeInTheDocument()
    expect(fetchPlayerSave).toHaveBeenCalledWith('p1')
    expect(screen.queryByRole('group', { name: '조회 기간' })).not.toBeInTheDocument()
  })

  it('moves between the tabs with the arrow keys, as one stop in the tab order', async () => {
    render(<PlayerHistoryPanel npid="p1" onClose={() => {}} />)
    await screen.findByText('12회')

    fireEvent.keyDown(tab('플레이 기록'), { key: 'ArrowRight' })
    expect(tab('전적')).toHaveAttribute('aria-selected', 'true')
    expect(tab('전적')).toHaveFocus()
    expect(tab('플레이 기록')).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(tab('전적'), { key: 'ArrowRight' })
    expect(tab('캐릭터별 계급')).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(tab('캐릭터별 계급'), { key: 'ArrowRight' })
    expect(tab('플레이 기록')).toHaveAttribute('aria-selected', 'true')
  })

  it('reads the records only once their tab is chosen, and opens an opponent in place', async () => {
    render(<PlayerHistoryPanel npid="p1" onClose={() => {}} />)
    await screen.findByText('12회')
    expect(fetchPlayerRecords).not.toHaveBeenCalled()

    fireEvent.click(tab('전적'))
    expect(await screen.findByText('1판 1승 0패')).toBeInTheDocument()
    expect(fetchPlayerRecords).toHaveBeenCalledWith('p1', null)

    fireEvent.click(screen.getByRole('button', { name: 'Rival 기록 보기' }))
    expect(await screen.findByRole('heading', { name: 'p2' })).toBeInTheDocument()
    expect(tab('전적')).toHaveAttribute('aria-selected', 'true')
    expect(fetchPlayerRecords).toHaveBeenLastCalledWith('p2', null)

    fireEvent.click(screen.getByRole('button', { name: 'p1' }))
    expect(await screen.findByRole('heading', { name: 'p1' })).toBeInTheDocument()
  })

  it('starts on the play history again when the caller opens another player', async () => {
    const { rerender } = render(<PlayerHistoryPanel npid="p1" onClose={() => {}} />)
    fireEvent.click(tab('캐릭터별 계급'))

    rerender(<PlayerHistoryPanel npid="p2" onClose={() => {}} />)
    expect(tab('플레이 기록')).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('12회')).toBeInTheDocument()
  })
})
