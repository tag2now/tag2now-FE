/** Start of the stats tab's hourly chart, in KST. */
export const DAY_START_HOUR = 8

/** Two digits, for a label. */
export const hourLabel = (hour: number): string => String(hour).padStart(2, '0')

/** The 24 hours of a day, starting at the given hour. */
export const dayHours = (startHour = DAY_START_HOUR): number[] =>
  Array.from({ length: 24 }, (_, offset) => (startHour + offset) % 24)

/** Re-orders hour-bucketed rows so the day starts where this app says it does.
 * Rows the payload omits are simply absent; nothing is invented to fill them. */
export function orderByDayStart<T>(rows: T[], hourOf: (row: T) => number): T[] {
  const byHour = new Map(rows.map((row) => [hourOf(row), row]))
  return dayHours().flatMap((hour) => {
    const row = byHour.get(hour)
    return row === undefined ? [] : [row]
  })
}
