import { describe, it, expect } from 'vitest'
import { completedDays, statDayOf } from '@/stat/completedDays'
import type { DailySummary } from '@/stat/types'

const day = (date: string, uniquePlayers = 10): DailySummary => ({
  date,
  peak_players: 5,
  avg_players: 3,
  peak_rooms: 2,
  unique_players: uniquePlayers,
})

/** 2026-09-17 at the given KST hour, as the UTC instant the browser holds. */
const kst = (hour: number, day = 17) =>
  new Date(Date.UTC(2026, 8, day, hour - 9, 0, 0))

describe('statDayOf', () => {
  it('names the calendar day for an afternoon', () => {
    expect(statDayOf(kst(14))).toBe('2026-09-17')
  })

  it('keeps the small hours on the day they started', () => {
    // 02:00 KST on the 17th is still the 16th's statistics day.
    expect(statDayOf(kst(2))).toBe('2026-09-16')
  })

  it('turns the day over at 06:00 KST', () => {
    expect(statDayOf(kst(5))).toBe('2026-09-16')
    expect(statDayOf(kst(6))).toBe('2026-09-17')
  })
})

describe('completedDays', () => {
  it('drops the day in progress', () => {
    const rows = [day('2026-09-15'), day('2026-09-16'), day('2026-09-17')]

    expect(completedDays(rows, kst(14)).map((r) => r.date)).toEqual([
      '2026-09-15',
      '2026-09-16',
    ])
  })

  it('keeps every row when the newest one is not today', () => {
    // Collection paused: the series ends yesterday, and that day is complete.
    const rows = [day('2026-09-15'), day('2026-09-16')]

    expect(completedDays(rows, kst(14))).toEqual(rows)
  })

  it('treats a row before 06:00 as the previous day, so it is still in progress', () => {
    const rows = [day('2026-09-15'), day('2026-09-16')]

    expect(completedDays(rows, kst(3)).map((r) => r.date)).toEqual(['2026-09-15'])
  })

  it('returns nothing when the only row is today', () => {
    expect(completedDays([day('2026-09-17')], kst(14))).toEqual([])
  })

  it('leaves an empty series alone', () => {
    expect(completedDays([], kst(14))).toEqual([])
  })
})
