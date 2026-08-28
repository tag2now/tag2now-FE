import { describe, it, expect } from 'vitest'
import { filterEntries, COLLAPSED_VISIBLE } from '@/shared/util/leaderboardFilter'
import type { LeaderboardEntry } from '@/shared/types'

const entry = (rank: number, online_name: string, main?: string, sub?: string): LeaderboardEntry => ({
  np_id: `p${rank}`,
  rank,
  online_name,
  player_info: {
    main_char_info: main ? { name: main } : null,
    sub_char_info: sub ? { name: sub } : null,
  },
})

const board = (count: number): LeaderboardEntry[] =>
  Array.from({ length: count }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya'))

const noFilter = { search: '', character: '', collapsed: false }

describe('filterEntries', () => {
  it('returns the whole board by default', () => {
    expect(filterEntries(board(500), noFilter)).toHaveLength(500)
  })

  it('truncates to the top ranks when collapsed', () => {
    const result = filterEntries(board(500), { ...noFilter, collapsed: true })
    expect(result).toHaveLength(COLLAPSED_VISIBLE)
    expect(result[COLLAPSED_VISIBLE - 1].rank).toBe(COLLAPSED_VISIBLE)
  })

  it('finds a player ranked beyond the collapsed view even while collapsed', () => {
    const entries = [...board(400), entry(401, 'hiddenGem', 'Lili')]
    const result = filterEntries(entries, { ...noFilter, collapsed: true, search: 'hiddenGem' })
    expect(result.map((e) => e.rank)).toEqual([401])
  })

  it('matches names case-insensitively and ignores surrounding whitespace', () => {
    const entries = [entry(1, 'KazuyaFan', 'Kazuya')]
    expect(filterEntries(entries, { ...noFilter, search: '  kazuyafan ' })).toHaveLength(1)
  })

  it('matches on a partial name', () => {
    const entries = [entry(1, 'KazuyaFan', 'Kazuya'), entry(2, 'JinMain', 'Jin')]
    expect(filterEntries(entries, { ...noFilter, search: 'zuya' }).map((e) => e.online_name))
      .toEqual(['KazuyaFan'])
  })

  it('does not match on np_id', () => {
    const entries = [entry(1, 'KazuyaFan', 'Kazuya')]
    expect(filterEntries(entries, { ...noFilter, search: 'p1' })).toEqual([])
  })

  it('filters by character across both main and sub slots', () => {
    const entries = [entry(1, 'a', 'Kazuya', 'Jin'), entry(2, 'b', 'Jin'), entry(3, 'c', 'Lili', 'Asuka')]
    expect(filterEntries(entries, { ...noFilter, character: 'Jin' }).map((e) => e.online_name))
      .toEqual(['a', 'b'])
  })

  it('applies search and character together', () => {
    const entries = [entry(1, 'proJin', 'Jin'), entry(2, 'proLili', 'Lili'), entry(3, 'casualJin', 'Jin')]
    const result = filterEntries(entries, { ...noFilter, search: 'pro', character: 'Jin' })
    expect(result.map((e) => e.online_name)).toEqual(['proJin'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterEntries(board(10), { ...noFilter, search: 'nobody' })).toEqual([])
  })
})
