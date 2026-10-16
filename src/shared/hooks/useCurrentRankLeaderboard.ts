import { GET } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import { POLL } from '@/config/polling'
import usePolledData, { type PolledState } from '@/shared/hooks/usePolledData'
import type { CurrentRankLeaderboard } from '@/shared/currentRankLeaderboard'

/** The most the backend answers in one request; the whole board, for now. */
const TOP = 1000

/** The window of the 최근 30일 option, which the backend filters and ranks within. */
export const RECENT_DAYS = 30

export const fetchCurrentRankLeaderboard = (): Promise<CurrentRankLeaderboard> => GET(API.currentRankLeaderboard().path, { top: TOP })

export const fetchRecentCurrentRankLeaderboard = (): Promise<CurrentRankLeaderboard> =>
  GET(API.currentRankLeaderboard().path, { top: TOP, days: RECENT_DAYS })

export default function useCurrentRankLeaderboard(): PolledState<CurrentRankLeaderboard> {
  return usePolledData(fetchCurrentRankLeaderboard, POLL.currentRankLeaderboard)
}

const nothing = async (): Promise<null> => null

/** Requested only while `enabled`, so the board costs nothing until the option is on. */
export function useRecentCurrentRankLeaderboard(enabled: boolean): PolledState<CurrentRankLeaderboard | null> {
  return usePolledData(enabled ? fetchRecentCurrentRankLeaderboard : nothing, POLL.currentRankLeaderboard)
}
