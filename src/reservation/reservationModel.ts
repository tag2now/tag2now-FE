import type { ApiReservation } from '@/reservation/reservationApi'
import { kstTimeFormat, MATCH_TYPE_LABELS } from '@/reservation/reservationLabels'

/** The reservation as the UI thinks about it, and the mapping to and from the
 * API's shape.
 *
 * This sat inside `Reservation.tsx` alongside three dialogs and eleven pieces
 * of state, which is why the component was 536 lines. None of it is rendering:
 * it is the vocabulary the panel, the form and the tests all share, so it lives
 * where each of them can import it without importing the panel.
 */

export type MatchType = '랭크매치' | '플레이어 매치' | '상관없음'
export type ReservationStatus = 'open' | 'full'
export type TypeFilter = '전체' | '랭크매치' | '플레이어 매치'

export type Reservation = {
  id: number
  time: string
  host: string
  ranks: string[]
  type: MatchType
  capacity: number
  joined: number
  participants: ApiReservation['participants']
  memo: string
  status: ReservationStatus
  contact?: string
}

/** The form's '상관없음' is a host saying either game suits them, which is not
 * the filter's '전체'; the two lists only look alike. */
export const TYPE_FILTERS: TypeFilter[] = ['전체', '랭크매치', '플레이어 매치']
export const FORM_MATCH_TYPES: MatchType[] = ['랭크매치', '플레이어 매치', '상관없음']

export const matchTypeLabels = MATCH_TYPE_LABELS as Record<ApiReservation['match_type'], MatchType>
export const matchTypeValues: Record<MatchType, ApiReservation['match_type']> = {
  '랭크매치': 'rank_match',
  '플레이어 매치': 'player_match',
  '상관없음': 'any',
}

export function fromApi(item: ApiReservation): Reservation {
  return {
    id: item.id,
    time: kstTimeFormat.format(new Date(item.start_at)),
    host: item.host_display_name,
    ranks: item.host_ranks,
    type: matchTypeLabels[item.match_type],
    capacity: item.capacity,
    joined: item.participant_count,
    participants: item.participants,
    memo: item.memo,
    status: item.status === 'open' && item.participant_count < item.capacity ? 'open' : 'full',
  }
}

export function availabilityMeta(reservation: Reservation) {
  if (reservation.status === 'full') return { label: '모집 완료', className: 'border-secondary text-secondary bg-secondary/10' }
  if (reservation.type === '랭크매치') return { label: '모집중', className: 'border-primary text-primary-text bg-primary/10' }
  return { label: `${reservation.joined}/${reservation.capacity}명`, className: 'border-primary text-primary-text bg-primary/10' }
}

/** A '상관없음' host takes either game, so both single-type filters keep them. */
export const matchesFilter = (reservation: Reservation, filter: TypeFilter): boolean =>
  filter === '전체' || reservation.type === filter || reservation.type === '상관없음'

/** The backend rejects a 21st rank with a 422, so the picker stops at 20. */
export const MAX_RANKS = 20
