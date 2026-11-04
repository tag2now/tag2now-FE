import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import { GET } from '@/shared/util/api'
import { fetchMatchRecords } from '@/shared/matchRecordsApi'
import type { PlayerSave } from '@/shared/saveChars'
import type { MatchRecordPage } from '@/shared/matchRecords'

vi.mock('@/shared/util/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/util/api')>('@/shared/util/api')
  return { ...actual, GET: vi.fn() }
})
vi.mock('@/shared/playerSaveApi', () => ({ fetchPlayerSave: vi.fn() }))
vi.mock('@/shared/matchRecordsApi', () => ({ fetchMatchRecords: vi.fn() }))

const HISTORY = { npid: 'p1', days_active: 3, times_seen: 12, first_seen: '2026-08-01', last_seen: '2026-09-01', room_type_counts: {}, active_hours: [] }
const SAVE: PlayerSave = { username: 'p1', saved_at: '2026-09-01T00:00:00Z', account_rank: 20, total: 3, wins: 2, losses: 1, chars: [] }
const RECORDS: MatchRecordPage = {
  next_before: null,
  matches: [{
    id: 1, played_at: '2026-09-01T00:00:00Z',
    p1: { npid: 'p1', online_name: 'P1', result: 'win', chars: null },
    p2: { npid: 'p2', online_name: 'Rival', result: 'loss', chars: null },
  }],
}

beforeEach(() => {
  vi.mocked(GET).mockReset().mockImplementation(async (path) => (path === 'records/opponents' ? [] : HISTORY))
  vi.mocked(fetchPlayerSave).mockReset().mockResolvedValue(SAVE)
  vi.mocked(fetchMatchRecords).mockReset().mockResolvedValue(RECORDS)
})

const tab = (name: string) => screen.getByRole('tab', { name })

describe('PlayerHistoryPanel tabs', () => {
  it('opens on the play history and reads the save only once its tab is chosen', async () => {
    render(<PlayerHistoryPanel npid="p1" onClose={() => {}} />)

    expect(tab('플레이 기록')).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('12회')).toBeInTheDocument()
    expect(screen.getByText('최근 30일 · 한국 시간')).toBeVisible()
    expect(screen.getByText('활동 시간 데이터가 아직 없습니다.')).toBeVisible()
    expect(fetchPlayerSave).not.toHaveBeenCalled()

    fireEvent.click(tab('캐릭터별 계급'))
    expect(await screen.findByText('3판 2승 1패')).toBeInTheDocument()
    expect(fetchPlayerSave).toHaveBeenCalledWith('p1')
    expect(screen.queryByRole('group', { name: '조회 기간' })).not.toBeInTheDocument()
  })

  it('updates the activity period when the history filter changes', async () => {
    render(<PlayerHistoryPanel npid="p1" onClose={() => {}} />)
    await screen.findByText('최근 30일 · 한국 시간')

    fireEvent.click(screen.getByRole('button', { name: '7일' }))
    expect(await screen.findByText('최근 7일 · 한국 시간')).toBeVisible()
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
    expect(fetchMatchRecords).not.toHaveBeenCalled()

    fireEvent.click(tab('전적'))
    expect(await screen.findByRole('button', { name: 'Rival 기록 보기' })).toBeInTheDocument()
    expect(fetchMatchRecords).toHaveBeenCalledWith({ npid: 'p1' }, null)

    fireEvent.click(screen.getByRole('button', { name: 'Rival 기록 보기' }))
    expect(await screen.findByRole('heading', { name: 'p2' })).toBeInTheDocument()
    expect(tab('전적')).toHaveAttribute('aria-selected', 'true')
    expect(fetchMatchRecords).toHaveBeenLastCalledWith({ npid: 'p2' }, null)

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
