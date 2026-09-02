import { GET } from '@/shared/util/api'
import usePolledData, { type PolledState } from '@/shared/hooks/usePolledData'
import { fetchPosts } from '@/community/communityApi'
import { fetchReservations } from '@/reservation/reservationApi'
import type { OverviewData } from '@/overview/types'

export const OVERVIEW_DAYS = 7
export const OVERVIEW_TOP_N = 5
export const OVERVIEW_POSTS = 3

/** One settled batch rather than four independent states.
 *
 * `allSettled` keeps a single failing source from blanking the whole page: a
 * down community endpoint should cost the user the posts card, not the KPIs.
 * A rejected source degrades to an empty list, which every card already renders
 * as "데이터 없음".
 */
export const fetchOverview = async (): Promise<OverviewData> => {
  const [daily, weeklyTop, posts, reservations] = await Promise.allSettled([
    GET('history/stats/daily', { days: OVERVIEW_DAYS }),
    GET('history/stats/weekly-top', { limit: OVERVIEW_TOP_N }),
    fetchPosts(1, OVERVIEW_POSTS),
    fetchReservations(),
  ])

  return {
    daily: settledOr(daily, []),
    weeklyTop: settledOr(weeklyTop, []),
    posts: settledOr(posts, { posts: [] }).posts ?? [],
    reservations: settledOr(reservations, []),
  }
}

function settledOr<T>(result: PromiseSettledResult<unknown>, fallback: T): T {
  return result.status === 'fulfilled' ? (result.value as T) : fallback
}

/** No interval: the overview is a snapshot with a manual refresh. Rooms — the
 * only genuinely live figure on the page — stays fresh through App's own poll.
 */
export default function useOverview(): PolledState<OverviewData> {
  return usePolledData(fetchOverview, null)
}
