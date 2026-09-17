import { describe, it, expect } from 'vitest'
import { filterEntries, tiersPresent, totals, COLLAPSED_VISIBLE } from '@/shared/util/leaderboardFilter'
import type { LeaderboardEntry } from '@/shared/types'

type CharSpec = { name: string, tier?: string, wins?: number, losses?: number }

const charOf = (spec?: string | CharSpec) => {
  if (!spec) return null
  const c = typeof spec === 'string' ? { name: spec } : spec
  return {
    name: c.name,
    wins: c.wins,
    losses: c.losses,
    ...(c.tier ? { rank_info: { name: c.name, tier: c.tier } } : {}),
  }
}

const entry = (rank: number, online_name: string, main?: string | CharSpec, sub?: string | CharSpec): LeaderboardEntry => ({
  np_id: `p${rank}`,
  rank,
  online_name,
  player_info: {
    main_char_info: charOf(main),
    sub_char_info: charOf(sub),
  },
})

const board = (count: number): LeaderboardEntry[] =>
  Array.from({ length: count }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya'))

const noFilter = { search: '', character: '', tier: '', sort: 'rank' as const, collapsed: false }

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

describe('sorting', () => {
  const rows = [
    entry(1, 'topRank', { name: 'Jin', wins: 50, losses: 50 }),
    entry(2, 'bestRate', { name: 'Jin', wins: 9, losses: 1 }),
    entry(3, 'mostGames', { name: 'Jin', wins: 100, losses: 100 }),
    entry(4, 'unplayed', { name: 'Jin' }),
  ]

  it('leaves board order alone by default', () => {
    expect(filterEntries(rows, noFilter).map((e) => e.online_name))
      .toEqual(['topRank', 'bestRate', 'mostGames', 'unplayed'])
  })

  it('orders by win rate across both characters', () => {
    expect(filterEntries(rows, { ...noFilter, sort: 'winRate' })[0].online_name).toBe('bestRate')
  })

  // 0% and "never played" are different answers. Treating an empty record as
  // zero would rank a player who has never played below everyone who has lost.
  it('sorts a player with no record last rather than at 0%', () => {
    const order = filterEntries(rows, { ...noFilter, sort: 'winRate' }).map((e) => e.online_name)
    expect(order[order.length - 1]).toBe('unplayed')
  })

  it('orders by total matches', () => {
    expect(filterEntries(rows, { ...noFilter, sort: 'matches' })[0].online_name).toBe('mostGames')
  })

  it('falls back to board rank so equal rows keep a stable order', () => {
    const tied = [
      entry(2, 'second', { name: 'Jin', wins: 5, losses: 5 }),
      entry(1, 'first', { name: 'Jin', wins: 5, losses: 5 }),
    ]
    expect(filterEntries(tied, { ...noFilter, sort: 'winRate' }).map((e) => e.online_name))
      .toEqual(['first', 'second'])
  })

  // Collapsing after the sort is what makes "top 100 by win rate" mean the
  // hundred best rates rather than the top hundred ranks reshuffled.
  it('collapses after sorting, not before', () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      entry(i + 1, `p${i + 1}`, { name: 'Jin', wins: i, losses: 150 - i }))
    const top = filterEntries(many, { ...noFilter, sort: 'winRate', collapsed: true })
    expect(top).toHaveLength(COLLAPSED_VISIBLE)
    expect(top[0].online_name).toBe('p150')
  })
})

describe('tier filtering', () => {
  const rows = [
    entry(1, 'blue', { name: 'Jin', tier: '파랑단' }),
    entry(2, 'red', { name: 'Jin', tier: '빨강단' }),
    entry(3, 'mixed', { name: 'Jin', tier: '녹단' }, { name: 'Lili', tier: '파랑단' }),
  ]

  it('keeps a player whose either character is in the band', () => {
    expect(filterEntries(rows, { ...noFilter, tier: '파랑단' }).map((e) => e.online_name))
      .toEqual(['blue', 'mixed'])
  })

  it('reports only the bands actually on the board, in promotion order', () => {
    expect(tiersPresent(rows)).toEqual(['녹단', '빨강단', '파랑단'])
  })

  // A filtered view is a complete answer about the whole board, so collapsing
  // must not silently cut it short.
  it('ignores the collapse when a band is chosen', () => {
    const many = Array.from({ length: 150 }, (_, i) => entry(i + 1, `p${i + 1}`, { name: 'Jin', tier: '파랑단' }))
    expect(filterEntries(many, { ...noFilter, tier: '파랑단', collapsed: true })).toHaveLength(150)
  })
})

describe('totals', () => {
  it('adds both characters together', () => {
    const e = entry(1, 'x', { name: 'Jin', wins: 3, losses: 1 }, { name: 'Lili', wins: 1, losses: 5 })
    expect(totals(e)).toMatchObject({ wins: 4, losses: 6, matches: 10, winRate: 0.4 })
  })

  it('reports no win rate rather than 0% when nothing has been played', () => {
    expect(totals(entry(1, 'x', 'Jin')).winRate).toBeNull()
  })
})
