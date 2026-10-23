import type { ApiReservation } from '@/reservation/reservationApi'

/** Presentation-only, kept out of reservationApi so it survives that module
 * being mocked wholesale in tests — and so the overview and the reservation tab
 * name a match the same way rather than each holding its own table. */
export const MATCH_TYPE_LABELS: Record<ApiReservation['match_type'], string> = {
  rank_match: '랭크매치',
  player_match: '플레이어 매치',
  any: '상관없음',
}

export const kstTimeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })

/** Still taking people: open, and not yet full.
 *
 * Three places ask this — the sidebar badge, the overview's KPI and the
 * overview's list — and each held its own copy of the rule. A `matched`
 * reservation is not joinable even though it is not cancelled either, which is
 * exactly the kind of detail one of three copies forgets. Here rather than in
 * `useReservations` because two of the three callers are not that hook. */
export const isJoinable = (r: Pick<ApiReservation, 'status' | 'participant_count' | 'capacity'>): boolean =>
  r.status === 'open' && r.participant_count < r.capacity
// en-CA writes a date as YYYY-MM-DD, which Date.parse reads back as UTC
// midnight — so two of them subtract to a whole number of days.
export const kstDateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })
const kstMonthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })
const RELATIVE_DAYS: Record<number, string> = { [-1]: '어제', 0: '오늘', 1: '내일' }

/** Which Seoul day a start falls on, relative to now.
 *
 * The listing runs from an hour ago to the next 06:00, so everything it returns
 * is yesterday, today or tomorrow — and a bare time cannot tell tonight's 23:00
 * from the 01:00 after it. Anything further out is not something the server
 * sends, but it is outside data, so it gets a plain M/D rather than a lie.
 */
export function kstDayLabel(startAt: Date, now: Date): string {
  const days = (Date.parse(kstDateKey.format(startAt)) - Date.parse(kstDateKey.format(now))) / 86_400_000
  return RELATIVE_DAYS[days] ?? kstMonthDay.format(startAt)
}
