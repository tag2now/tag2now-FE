import { GET } from '@/shared/util/api'
import usePolledData, { type PolledState } from '@/shared/hooks/usePolledData'
import { API } from '@/config/endpoints'
import { POLL } from '@/config/polling'
import { fetchPosts } from '@/community/communityApi'
import { fetchReservations } from '@/reservation/reservationApi'
import type { OverviewData } from '@/overview/types'

export const OVERVIEW_DAYS = 7
export const OVERVIEW_TOP_N = 5
// Two, as the reservation card beside it: the pair share a grid row, so the
// taller one sets its height and a third item in either costs the whole row.
export const OVERVIEW_POSTS = 2

/** One settled batch rather than four independent states.
 *
 * `allSettled` keeps a single failing source from blanking the whole page: a
 * down community endpoint should cost the user the posts card, not the KPIs.
 * A rejected source degrades to an empty list, which every card already renders
 * as its own empty state. Those name what is absent, never why — a failure and
 * a genuinely empty list arrive here as the same value.
 */
export const fetchOverview = async (): Promise<OverviewData> => {
  const [daily, weeklyTop, posts, reservations] = await Promise.allSettled([
    GET(API.dailyStats().path, { days: OVERVIEW_DAYS }),
    GET(API.weeklyTop().path, { limit: OVERVIEW_TOP_N }),
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

/** No interval: the overview is a snapshot, fetched each time its route mounts,
 * so leaving the tab and coming back refreshes it. Rooms — the only genuinely
 * live figure on the page — stays fresh through App's own poll.
 */
export default function useOverview(): PolledState<OverviewData> {
  return usePolledData(fetchOverview, POLL.overview)
}
