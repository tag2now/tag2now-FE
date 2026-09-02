import type { DailySummary, WeeklyTopPlayer } from '@/stat/types'
import type { PostSummary } from '@/community/types'
import type { ApiReservation } from '@/reservation/reservationApi'

/** Everything the overview fetches for itself.
 *
 * Rooms and leaderboard are deliberately absent: App already polls both and
 * passes them down, so refetching them here would double the traffic for data
 * the page already holds.
 */
export interface OverviewData {
  daily: DailySummary[]
  weeklyTop: WeeklyTopPlayer[]
  posts: PostSummary[]
  reservations: ApiReservation[]
}
