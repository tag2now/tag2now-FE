import usePolledData, { type PolledState } from '@/shared/hooks/usePolledData'
import { fetchReservations, type ApiReservation } from '@/reservation/reservationApi'

// Reservations are scheduled minutes-to-hours ahead, so they move far more
// slowly than rooms. A minute keeps the nav badge honest without competing with
// the Reservation tab's own 10s poll, which briefly runs alongside this one
// while that tab is open.
const RESERVATIONS_REFRESH_INTERVAL = 60_000

export default function useReservations(): PolledState<ApiReservation[]> {
  return usePolledData(fetchReservations, RESERVATIONS_REFRESH_INTERVAL)
}

/** Open reservations are the ones a user can still join — a full or ended one
 * is not something the badge should invite them to look at.
 */
export function countOpen(reservations: ApiReservation[] | null): number {
  if (!reservations) return 0
  return reservations.filter(r => r.status === 'open' && r.participant_count < r.capacity).length
}
