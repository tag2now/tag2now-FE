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
