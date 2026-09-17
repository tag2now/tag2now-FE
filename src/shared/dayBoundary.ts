/** Where a player's day begins, in KST.
 *
 * Not midnight: a session that runs 22:00 to 02:00 is one evening, and cutting
 * it at 00:00 reports it as two stubs pinned to opposite ends of every chart
 * that shows it. Not the statistics day either — the backend aggregates its
 * daily rows from 06:00 and this app cannot re-cut them — but the hour people
 * actually get up, which is the cut a reader is looking for when they ask when
 * someone plays.
 *
 * Two places read it and both are hour-bucketed data the frontend can rotate
 * itself: the activity strip in PLAYER INSIGHTS and the hourly chart on the
 * stats tab. Anything derived from `DailySummary` cannot follow — those rows
 * arrive already bucketed, and the labels on them say so.
 */
export const DAY_START_HOUR = 8

/** Two digits, for a label. */
export const hourLabel = (hour: number): string => String(hour).padStart(2, '0')

/** The 24 hours of a day that begins at `DAY_START_HOUR`, in order. */
export const dayHours = (): number[] =>
  Array.from({ length: 24 }, (_, offset) => (DAY_START_HOUR + offset) % 24)

/** Re-orders hour-bucketed rows so the day starts where this app says it does.
 * Rows the payload omits are simply absent; nothing is invented to fill them. */
export function orderByDayStart<T>(rows: T[], hourOf: (row: T) => number): T[] {
  const byHour = new Map(rows.map((row) => [hourOf(row), row]))
  return dayHours().flatMap((hour) => {
    const row = byHour.get(hour)
    return row === undefined ? [] : [row]
  })
}
