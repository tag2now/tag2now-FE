import {GET} from '@/shared/api'
import usePolledData from './usePolledData'
import type { LeaderboardData, PolledState } from '@/types'

export const fetchLeaderboard = async () => {
  const data: Record<string, any> = await GET('leaderboard', {top: 100});
  const entries = (data.entries as Array<Record<string, unknown>>) ?? []
  return {
    ...data,
    entries: entries.map((e, i) => ({ rank: i + 1, ...e }))
  } as LeaderboardData
}

export default function useLeaderboard(): PolledState<LeaderboardData> {
  return usePolledData(fetchLeaderboard, null)
}
