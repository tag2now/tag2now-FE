import {GET} from "@/shared/util/api";
import { API } from "@/config/endpoints";
import { POLL } from "@/config/polling";
import usePolledData, { type PolledState} from "@/shared/hooks/usePolledData";
import type { LeaderboardData, LeaderboardResponse } from "@/shared/types";

export const fetchLeaderboard = async (): Promise<LeaderboardData> => {
  const data = await GET<LeaderboardResponse>(API.leaderboard().path, {top: 500});
  const entries = data.entries ?? []
  return {
    ...data,
    entries: entries.map((e, i) => ({ rank: i + 1, ...e }))
  }
}

export default function useLeaderboard(): PolledState<LeaderboardData> {
  return usePolledData(fetchLeaderboard, POLL.leaderboard)
}
