import { describe, expect, it } from 'vitest'
import { RANK_ORDER, sortRanksDescending, indexOfRank, rankName } from '@/shared/ranks'

// Pre-refactor safety net for rank ordering and code-to-name conversion.
// A post-refactor failure means their public results changed.
describe('RANK_ORDER', () => {
  // Verified against the Tekken wiki's TTT2 ranking list: Beginner, nine kyu,
  // three dan, then 4단 Disciple through 100단 True Tekken God.
  it('holds all 43 TTT2 ranks, lowest first', () => {
    expect(RANK_ORDER).toHaveLength(43)
    expect(RANK_ORDER[0]).toBe('Beginner')
    expect(RANK_ORDER[35]).toBe('Yaksa')
    expect(RANK_ORDER.at(-1)).toBe('True Tekken God')
  })

  it('names every rank exactly once', () => {
    expect(new Set(RANK_ORDER).size).toBe(RANK_ORDER.length)
  })

  it('keeps the seven ranks above Yaksa in game order', () => {
    expect(RANK_ORDER.slice(36)).toEqual([
      'Majin', 'Toshin', 'Emperor', 'Tekken Lord', 'Tekken Emperor', 'Tekken God', 'True Tekken God',
    ])
  })
})

describe('sortRanksDescending', () => {
  it('leaves the supplied order intact and preserves repeated ranks', () => {
    const ranks = ['Beginner', 'Yaksa', 'Beginner']

    expect(sortRanksDescending(ranks)).toEqual(['Yaksa', 'Beginner', 'Beginner'])
    expect(ranks).toEqual(['Beginner', 'Yaksa', 'Beginner'])
  })

  it('accepts an empty selection', () => {
    expect(sortRanksDescending([])).toEqual([])
  })

  it('puts the higher rank first', () => {
    expect(sortRanksDescending(['Vanquisher', 'Yaksa', 'Beginner']))
      .toEqual(['Yaksa', 'Vanquisher', 'Beginner'])
  })

  it('ranks the new top seven above Yaksa', () => {
    expect(sortRanksDescending(['Yaksa', 'Tekken God'])).toEqual(['Tekken God', 'Yaksa'])
  })

  // An unknown rank used to sort below Beginner, because a missing index read
  // as -1. A rank we have not heard of is far more likely to be a new *top*
  // than a new bottom, and either way the weakest position is a guess.
  it('sorts a rank it has never heard of last, not below Beginner', () => {
    expect(indexOfRank('Nonesuch')).toBe(-1)
    expect(sortRanksDescending(['Beginner', 'Nonesuch', 'Yaksa']))
      .toEqual(['Yaksa', 'Beginner', 'Nonesuch'])
  })
})

describe('rankName', () => {
  it.each([
    [0, 'Beginner'],
    [42, 'True Tekken God'],
    [-1, '계급 -1'],
    [43, '계급 43'],
  ])('names code %i as %s', (code, name) => {
    expect(rankName(code)).toBe(name)
  })
})
