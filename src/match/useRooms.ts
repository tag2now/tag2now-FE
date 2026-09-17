import usePolledData, {PolledState} from "@/shared/hooks/usePolledData";
import type {RoomsData, Room} from "@/match/types";
import {GET} from "@/shared/util/api";
import { API } from "@/config/endpoints";
import { POLL } from "@/config/polling";

export const fetchRoomsAll =  async () => {
  const data: Record<string, any> = await GET(API.rooms().path);
  // @ts-ignore

  Object.values(data).forEach(rooms =>
    // @ts-ignore
    rooms.forEach(({users}) =>
      // @ts-ignore
      users.forEach(user => user['np_id'] = user.npid)
    )
  )

  const groups = Object.fromEntries(
      Object.entries(data)
          .filter(([, v]) => Array.isArray(v))
          // shuffle 1p 2p
          .sort(() => Math.random() - 0.5)
  ) as Record<string, Room[]>;

  const { total, totalUsers } = Object.values(groups).reduce(
      (acc, arr) => ({
        total: acc.total + arr.length,
        totalUsers: acc.totalUsers + arr.reduce((s, r) => s + (r.users?.length ?? 0), 0),
      }), { total: 0, totalUsers: 0 }
  )
  return { groups, total, totalUsers }
}

export default function useRooms(): PolledState<RoomsData> {
  return usePolledData(fetchRoomsAll, POLL.rooms)
}
