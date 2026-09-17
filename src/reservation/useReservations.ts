import createPolledSource from '@/shared/hooks/createPolledSource'
import type { PolledState } from '@/shared/hooks/usePolledData'
import { POLL } from '@/config/polling'
import { fetchReservations, type ApiReservation } from '@/reservation/reservationApi'
import { isJoinable } from '@/reservation/reservationLabels'

/** One poll of /reservations for the whole app.
 *
 * Two components want this list at once — the sidebar badge on every tab, and
 * the reservation panel while it is open — and they used to be two hooks with
 * two timers, so the endpoint was fetched twice whenever that tab was open and
 * the badge could sit up to a minute behind the list beside it. They now share
 * a single request; the panel asks for a faster rate and the source runs at the
 * fastest rate anyone wants.
 */
const useReservationSource = createPolledSource(fetchReservations)

export default function useReservations(
  interval: number | null = POLL.reservationsBackground,
): PolledState<ApiReservation[]> {
  return useReservationSource(interval)
}

/** Open reservations are the ones a user can still join — a full or ended one
 * is not something the badge should invite them to look at.
 */
export function countOpen(reservations: ApiReservation[] | null): number {
  if (!reservations) return 0
  return reservations.filter(isJoinable).length
}
