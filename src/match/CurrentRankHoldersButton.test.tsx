import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CurrentRankHoldersButton from '@/match/CurrentRankHoldersButton'
import { endSession, startSession } from '@/auth/session'
import { GET } from '@/shared/util/api'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import { bestPlayedRank } from '@/match/useCurrentRankHolders'
import type { PlayerSave, SaveChar } from '@/shared/saveChars'

vi.mock('@/shared/util/api', () => ({ GET: vi.fn() }))
vi.mock('@/shared/playerSaveApi', () => ({ fetchPlayerSave: vi.fn() }))

const char = (id: number, rank: number, wins: number): SaveChar =>
  ({ id, character: 'Paul', rank, rank_name: '', tier: '', points: 0, streak: 0, wins, losses: 0 })

const save = (...chars: SaveChar[]): PlayerSave =>
  ({ username: 'me', saved_at: '2026-10-20T00:00:00Z', account_rank: 30, total: 0, wins: 0, losses: 0, chars })

const holders = (rank: number) => ({ rank, rank_name: `R${rank}`, total: 0, entries: [] })

const askedRanks = () => vi.mocked(GET).mock.calls.map(([, params]) => (params as { rank: number }).rank)

const signIn = () => startSession('token', 3600, { username: 'me', online_name: '나', avatar_url: '', admin: false })

const open = () => fireEvent.click(screen.getByRole('button', { name: '같은 계급 상대 찾기' }))

const choose = (rank: string) => {
  fireEvent.click(screen.getByRole('button', { name: /^계급:/ }))
  fireEvent.click(screen.getByRole('button', { name: rank }))
}

beforeEach(() => {
  vi.mocked(GET).mockReset().mockImplementation(async (_path, params) => holders((params as { rank: number }).rank))
  vi.mocked(fetchPlayerSave).mockReset()
})

afterEach(() => endSession())

describe('CurrentRankHoldersButton', () => {
  it('asks nothing until opened, and a signed-out reader nothing until a rank is chosen', async () => {
    render(<CurrentRankHoldersButton roomUsers={[]} />)
    expect(screen.queryByRole('dialog')).toBeNull()

    open()
    expect(screen.getByRole('dialog', { name: '같은 계급 상대 찾기' })).toBeInTheDocument()
    expect(fetchPlayerSave).not.toHaveBeenCalled()
    expect(GET).not.toHaveBeenCalled()

    choose('Mentor')
    await waitFor(() => expect(askedRanks()).toEqual([14]))
  })

  it('opens on the highest rank the signed-in player plays at', async () => {
    signIn()
    vi.mocked(fetchPlayerSave).mockResolvedValue(save(char(0, 14, 3), char(1, 22, 1), char(2, 30, 0)))
    render(<CurrentRankHoldersButton roomUsers={[]} />)
    expect(fetchPlayerSave).not.toHaveBeenCalled()

    open()
    await waitFor(() => expect(askedRanks()).toEqual([22]))
    expect(fetchPlayerSave).toHaveBeenCalledWith('me')
  })

  it('keeps a rank the reader chose over their own arriving late', async () => {
    signIn()
    let answer: (s: PlayerSave) => void = () => {}
    vi.mocked(fetchPlayerSave).mockReturnValue(new Promise((resolve) => { answer = resolve }))
    render(<CurrentRankHoldersButton roomUsers={[]} />)
    open()

    choose('3rd dan')
    await act(async () => answer(save(char(0, 25, 1))))
    expect(askedRanks()).toEqual([12])
  })

  it('remembers the rank chosen when opened again', async () => {
    render(<CurrentRankHoldersButton roomUsers={[]} />)
    open()
    choose('Mentor')
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    open()
    expect(screen.getByRole('button', { name: '계급: Mentor' })).toBeInTheDocument()
    await waitFor(() => expect(askedRanks()).toEqual([14, 14]))
  })
})

describe('bestPlayedRank', () => {
  it('takes the highest played character from 1st dan up', () => {
    expect(bestPlayedRank(save(char(0, 9, 5), char(1, 12, 1), char(2, 20, 0)))).toBe(12)
  })

  it('is null for a save with nothing played at 1st dan or above', () => {
    expect(bestPlayedRank(save(char(0, 25, 0), char(1, 3, 2)))).toBeNull()
  })
})
