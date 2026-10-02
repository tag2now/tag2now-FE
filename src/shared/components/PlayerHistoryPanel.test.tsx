import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import { GET } from '@/shared/util/api'
import type { PlayerSave } from '@/shared/saveChars'

vi.mock('@/shared/util/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/util/api')>('@/shared/util/api')
  return { ...actual, GET: vi.fn() }
})
vi.mock('@/shared/playerSaveApi', () => ({ fetchPlayerSave: vi.fn() }))

const HISTORY = { npid: 'p1', days_active: 3, times_seen: 12, first_seen: '2026-08-01', last_seen: '2026-09-01', room_type_counts: {}, top_played_with: [], active_hours: [] }
const SAVE: PlayerSave = { username: 'p1', saved_at: '2026-09-01T00:00:00Z', account_rank: 20, total: 3, wins: 2, losses: 1, chars: [] }

beforeEach(() => {
  vi.mocked(GET).mockReset().mockResolvedValue(HISTORY)
  vi.mocked(fetchPlayerSave).mockReset().mockResolvedValue(SAVE)
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
    expect(tab('캐릭터별 계급')).toHaveAttribute('aria-selected', 'true')
    expect(tab('캐릭터별 계급')).toHaveFocus()
    expect(tab('플레이 기록')).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(tab('캐릭터별 계급'), { key: 'ArrowRight' })
    expect(tab('플레이 기록')).toHaveAttribute('aria-selected', 'true')
  })

  it('starts on the play history again when the caller opens another player', async () => {
    const { rerender } = render(<PlayerHistoryPanel npid="p1" onClose={() => {}} />)
    fireEvent.click(tab('캐릭터별 계급'))

    rerender(<PlayerHistoryPanel npid="p2" onClose={() => {}} />)
    expect(tab('플레이 기록')).toHaveAttribute('aria-selected', 'true')
  })
})
