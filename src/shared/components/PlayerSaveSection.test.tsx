import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import PlayerSaveSection from '@/shared/components/PlayerSaveSection'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import { AppError } from '@/shared/util/AppError'
import type { PlayerSave, SaveChar } from '@/shared/saveChars'

vi.mock('@/shared/playerSaveApi', () => ({ fetchPlayerSave: vi.fn() }))

const char = (id: number, character: string, rank: number, rank_name: string, wins = 0, losses = 0): SaveChar =>
  ({ id, character, rank, rank_name, tier: '', points: 100, streak: 0, wins, losses })

const SAVE: PlayerSave = {
  username: 'Alice',
  saved_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
  account_rank: 20,
  total: 15,
  wins: 10,
  losses: 5,
  chars: [
    char(0, 'Paul', 12, '3rd dan', 4, 1),
    char(2, 'Lei', 20, 'Berserker', 6, 4),
    // a slot never played: not shown
    char(3, 'King', 0, 'Beginner'),
  ],
}

const section = () => screen.getByRole('region', { name: '캐릭터별 계급' })

beforeEach(() => {
  vi.mocked(fetchPlayerSave).mockReset()
})

describe('PlayerSaveSection', () => {
  it("shows the account rank, the record and the used characters, highest rank first", async () => {
    vi.mocked(fetchPlayerSave).mockResolvedValue(SAVE)
    render(<PlayerSaveSection npid="Alice" />)

    const rows = await within(section()).findAllByRole('row')
    expect(rows.slice(1).map((row) => within(row).getAllByRole('img')[0].getAttribute('alt'))).toEqual(['Lei', 'Paul'])
    expect(within(section()).getByText('15판 10승 5패')).toBeInTheDocument()
    expect(within(section()).getByText('3시간 전 저장')).toBeInTheDocument()
    expect(fetchPlayerSave).toHaveBeenCalledWith('Alice')
  })

  it('says there is no save when the server has none', async () => {
    vi.mocked(fetchPlayerSave).mockRejectedValue(new AppError('이 플레이어의 TTT2 세이브가 없습니다.', 404))
    render(<PlayerSaveSection npid="Bob" />)

    expect(await within(section()).findByText('캐릭터 계급 정보가 없습니다.')).toBeInTheDocument()
  })

  it('reports a failed read in the section alone', async () => {
    vi.mocked(fetchPlayerSave).mockRejectedValue(new AppError('세이브 서버에 연결할 수 없습니다.', 502))
    render(<PlayerSaveSection npid="Alice" />)

    expect(await within(section()).findByRole('alert')).toHaveTextContent('세이브를 불러오지 못했습니다')
  })

  it('reads the new player when the panel moves to another', async () => {
    vi.mocked(fetchPlayerSave).mockResolvedValue(SAVE)
    const { rerender } = render(<PlayerSaveSection npid="Alice" />)
    await within(section()).findAllByRole('row')

    rerender(<PlayerSaveSection npid="Carol" />)
    expect(fetchPlayerSave).toHaveBeenLastCalledWith('Carol')
  })
})
