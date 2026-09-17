import { describe, expect, it } from 'vitest'
import { RANK_ORDER, sortRanksDescending, indexOfRank } from '@/reservation/reservationLabels'
import { rankBands, tierOfRank, rememberTier, UNCONFIRMED_BAND, isConfirmedTier } from '@/shared/rankTiers'

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

describe('tier bands', () => {
  it('splits the numeric climb into 급 and 단', () => {
    // The backend answers 숫자단 for both, collapsing the kyu ranks into the
    // dan band. The table is the authority here, so the split survives.
    expect(tierOfRank('Beginner')).toBe('숫자급')
    expect(tierOfRank('1st kyu')).toBe('숫자급')
    expect(tierOfRank('1st dan')).toBe('숫자단')
    expect(tierOfRank('3rd dan')).toBe('숫자단')
  })

  it('places every coloured band', () => {
    expect(tierOfRank('Grand Master')).toBe('액자단')
    expect(tierOfRank('Berserker')).toBe('녹단')
    expect(tierOfRank('Pugilist')).toBe('노랑단')
    expect(tierOfRank('Savior')).toBe('주황단')
    expect(tierOfRank('Suzaku')).toBe('빨강단')
    expect(tierOfRank('Toshin')).toBe('파랑단')
    expect(tierOfRank('Tekken Emperor')).toBe('보라단')
    expect(tierOfRank('True Tekken God')).toBe('황금단')
  })

  // 파랑단 runs Fujin through Toshin, so Yaksa is not the top of it.
  it('keeps Yaksa inside 파랑단 rather than ending the band there', () => {
    expect(tierOfRank('Yaksa')).toBe('파랑단')
    expect(tierOfRank('Majin')).toBe('파랑단')
  })

  it('places every rank in a band', () => {
    for (const rank of RANK_ORDER) expect(isConfirmedTier(tierOfRank(rank))).toBe(true)
  })

  it('falls back for a rank it has never heard of', () => {
    expect(tierOfRank('Nonesuch')).toBe(UNCONFIRMED_BAND)
    expect(isConfirmedTier(UNCONFIRMED_BAND)).toBe(false)
  })

  it('learns a band for an unknown rank from the API', () => {
    rememberTier('Nonesuch', '무지개단')
    expect(tierOfRank('Nonesuch')).toBe('무지개단')
  })

  // A payload is not an argument against a decision this app has made — the
  // backend calls Beginner 숫자단 and must not be allowed to undo the split.
  it('refuses to let the API overwrite a band the table already names', () => {
    rememberTier('Beginner', '숫자단')
    expect(tierOfRank('Beginner')).toBe('숫자급')
  })

  it('ignores an empty band rather than recording it', () => {
    rememberTier('Nothing', '')
    expect(tierOfRank('Nothing')).toBe(UNCONFIRMED_BAND)
  })
})

describe('rankBands (picker layout)', () => {
  it('covers every rank exactly once', () => {
    const flat = rankBands().flatMap((b) => b.rows.flat()).filter(Boolean)
    expect(flat).toHaveLength(RANK_ORDER.length)
    expect(new Set(flat).size).toBe(RANK_ORDER.length)
  })

  // Korean reads left to right, so "highest first" is the top-LEFT cell.
  it('opens on the strongest band with the highest rank at the top left', () => {
    const rows = rankBands()[0].rows
    expect(rows[0][0]).toBe('True Tekken God')
  })

  it('pads a short band on the right so its left edge stays flush', () => {
    const gold = rankBands()[0]
    expect(gold.tier).toBe('황금단')
    expect(gold.rows).toEqual([['True Tekken God', 'Tekken God', null, null]])
  })

  it('wraps a five-rank band with the weakest falling to the second row', () => {
    const blue = rankBands().find((b) => b.tier === '파랑단')!
    expect(blue.rows).toEqual([
      ['Toshin', 'Majin', 'Yaksa', 'Raijin'],
      ['Fujin', null, null, null],
    ])
  })

  it('never lets a band straddle a row', () => {
    for (const band of rankBands()) {
      for (const row of band.rows) {
        for (const rank of row) {
          if (rank) expect(tierOfRank(rank)).toBe(band.tier)
        }
      }
    }
  })
})
