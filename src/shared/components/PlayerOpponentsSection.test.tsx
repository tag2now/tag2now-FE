import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PlayerOpponentsSection from '@/shared/components/PlayerOpponentsSection'
import { GET } from '@/shared/util/api'
import type { OpponentRecord } from '@/shared/playerHistoryTypes'

vi.mock('@/shared/util/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/util/api')>('@/shared/util/api')
  return { ...actual, GET: vi.fn() }
})

const OPPONENTS: OpponentRecord[] = [
  { npid: 'np_002', online_name: 'KingOfIronFist', match_count: 12, wins: 8, losses: 4 },
  { npid: 'np_003', online_name: 'TagComboKing', match_count: 3, wins: 1, losses: 2 },
]

const row = (name: string) => screen.findByRole('button', { name: `${name} 기록 보기` })

beforeEach(() => {
  vi.mocked(GET).mockReset().mockResolvedValue(OPPONENTS)
})

describe('PlayerOpponentsSection', () => {
  it("shows each opponent's matches, wins, losses and rounded win rate, most met first", async () => {
    render(<PlayerOpponentsSection npid="np_001" days={30} onOpen={() => {}} />)

    expect(await row('KingOfIronFist')).toHaveTextContent('12판8W4L67%')
    expect(await row('TagComboKing')).toHaveTextContent('3판1W2L33%')
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')))
      .toEqual(['KingOfIronFist 기록 보기', 'TagComboKing 기록 보기'])
    expect(GET).toHaveBeenCalledWith('records/opponents', { npid: 'np_001', days: 30 })
  })

  it('opens the opponent a row names', async () => {
    const onOpen = vi.fn()
    render(<PlayerOpponentsSection npid="np_001" days={30} onOpen={onOpen} />)

    fireEvent.click(await row('TagComboKing'))
    expect(onOpen).toHaveBeenCalledWith('np_003')
  })

  it('reads again for another period', async () => {
    const { rerender } = render(<PlayerOpponentsSection npid="np_001" days={30} onOpen={() => {}} />)
    await row('KingOfIronFist')

    rerender(<PlayerOpponentsSection npid="np_001" days={7} onOpen={() => {}} />)
    await row('KingOfIronFist')
    expect(GET).toHaveBeenLastCalledWith('records/opponents', { npid: 'np_001', days: 7 })
  })

  it('says so when the player met no one', async () => {
    vi.mocked(GET).mockResolvedValue([])
    render(<PlayerOpponentsSection npid="np_001" days={30} onOpen={() => {}} />)

    expect(await screen.findByText('함께 플레이한 기록이 아직 없습니다.')).toBeInTheDocument()
  })

  it('says so when the opponents could not be read', async () => {
    vi.mocked(GET).mockRejectedValue(new Error('502'))
    render(<PlayerOpponentsSection npid="np_001" days={30} onOpen={() => {}} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('함께한 플레이어를 불러오지 못했습니다.')
  })
})
