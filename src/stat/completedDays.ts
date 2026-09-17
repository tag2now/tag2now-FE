import type { DailySummary } from '@/stat/types'

/** The hour the backend's statistics day begins, in KST.
 *
 * Not `DAY_START_HOUR` from shared/dayBoundary: that one is where a *player's*
 * day begins (08:00), and the frontend picks it because it re-orders
 * hour-bucketed rows itself. These rows arrive already grouped by the
 * backend's own boundary, so this constant mirrors the server rather than
 * choosing anything. It exists to answer one question — which row is today's.
 */
const STAT_DAY_START_HOUR = 6

const KST_OFFSET_HOURS = 9

/** The statistics day `moment` falls in, as the "YYYY-MM-DD" the rows carry.
 *
 * Shifting the clock to KST and then back by the start hour turns the 06:00
 * boundary into a plain midnight one, which is the same trick the backend's
 * `stat_day` uses — expressed here in the only calendar the browser has.
 */
export function statDayOf(moment: Date): string {
  const shifted = new Date(moment.getTime() + (KST_OFFSET_HOURS - STAT_DAY_START_HOUR) * 3_600_000)
  return shifted.toISOString().slice(0, 10)
}

/** The rows for days that have finished, newest last.
 *
 * A statistics day in progress has had only part of its hours counted, so its
 * unique players and its peak both sit below what the day will end on. Drawn
 * beside completed days it reads as a collapse in activity rather than as a
 * day that is not over, and it is the last point on the line — the one a
 * reader's eye lands on.
 *
 * Only a row that *is* today is dropped. The newest row is not always today:
 * the series ends wherever the last snapshot landed, and slicing the end off
 * unconditionally would discard a real, finished day whenever collection has
 * paused.
 */
export function completedDays(rows: DailySummary[], now: Date = new Date()): DailySummary[] {
  const today = statDayOf(now)
  return rows.filter((row) => row.date !== today)
}
