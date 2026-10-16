import { GET } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import { POLL } from '@/config/polling'
import usePolledData, { type PolledState } from '@/shared/hooks/usePolledData'
import type { CurrentRankLeaderboard } from '@/shared/currentRankLeaderboard'

/** The most the backend answers in one request; the whole board, for now. */
const TOP = 1000

export const fetchCurrentRankLeaderboard = (): Promise<CurrentRankLeaderboard> => GET(API.currentRankLeaderboard().path, { top: TOP })

export default function useCurrentRankLeaderboard(): PolledState<CurrentRankLeaderboard> {
  return usePolledData(fetchCurrentRankLeaderboard, POLL.currentRankLeaderboard)
}
