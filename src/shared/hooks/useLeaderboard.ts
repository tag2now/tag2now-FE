import {GET} from "@/shared/util/api";
import { API } from "@/config/endpoints";
import { POLL } from "@/config/polling";
import usePolledData, { type PolledState} from "@/shared/hooks/usePolledData";
import type { LeaderboardData } from "@/shared/types";

export const fetchLeaderboard = async () => {
  const data: Record<string, any> = await GET(API.leaderboard().path, {top: 500});
  const entries = (data.entries as Array<Record<string, unknown>>) ?? []
  return {
    ...data,
    entries: entries.map((e, i) => ({ rank: i + 1, ...e }))
  } as LeaderboardData
}

export default function useLeaderboard(): PolledState<LeaderboardData> {
  return usePolledData(fetchLeaderboard, POLL.leaderboard)
}
