import { describe, it, expect } from 'vitest'
import { toLeaderboardData, type CurrentRankLeaderboardEntry } from '@/shared/currentRankLeaderboard'
import type { SaveChar } from '@/shared/saveChars'

const char = (character: string, rank_name: string, tier: string, wins = 0, losses = 0): SaveChar => ({
  id: 0, character, rank: 20, rank_name, tier, points: 0, streak: 0, wins, losses,
})

const entry = (rank: number, username: string, ...chars: SaveChar[]): CurrentRankLeaderboardEntry => ({
  rank, username, saved_at: '2026-10-16T01:02:03Z', account_rank: 20, chars,
})

describe('toLeaderboardData', () => {
  it('puts the highest character in the main slot and the second in the sub', () => {
    const data = toLeaderboardData({ total: 1, entries: [
      entry(1, 'np_1', char('Jin', 'Yaksa', '파랑단', 30, 5), char('Lars', 'Warrior', '노랑단', 2, 1)),
    ] })
    expect(data.entries[0].player_info).toEqual({
      main_char_info: { name: 'Jin', rank_info: { name: 'Yaksa', tier: '파랑단' }, wins: 30, losses: 5 },
      sub_char_info: { name: 'Lars', rank_info: { name: 'Warrior', tier: '노랑단' }, wins: 2, losses: 1 },
    })
  })

  it('leaves the sub slot empty for a player with one ranked character', () => {
    const data = toLeaderboardData({ total: 1, entries: [entry(1, 'np_1', char('Jin', 'Yaksa', '파랑단'))] })
    expect(data.entries[0].player_info?.sub_char_info).toBeNull()
  })

  it('keeps the backend place, shared ones included, and the total', () => {
    const data = toLeaderboardData({ total: 3, entries: [entry(1, 'a'), entry(2, 'b'), entry(2, 'c')] })
    expect(data.total_records).toBe(3)
    expect(data.entries.map((e) => [e.rank, e.np_id])).toEqual([[1, 'a'], [2, 'b'], [2, 'c']])
  })

  it('names a player from the score board, and by their id when it does not know them', () => {
    const named = [{ np_id: 'np_1', rank: 7, online_name: 'TTT2_Master' }]
    const data = toLeaderboardData({ total: 2, entries: [entry(1, 'np_1'), entry(2, 'np_new')] }, named)
    expect(data.entries.map((e) => e.online_name)).toEqual(['TTT2_Master', 'np_new'])
  })
})
