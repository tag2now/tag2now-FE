import usePolledData, {PolledState} from "@/shared/hooks/usePolledData";
import type {ApiRoom, RoomGroups, RoomsData, RoomsResponse} from "@/match/types";
import {GET} from "@/shared/util/api";
import { API } from "@/config/endpoints";
import { POLL } from "@/config/polling";

const toRoom = <T extends ApiRoom>(room: T) => ({
  ...room,
  users: room.users.map(user => ({ ...user, np_id: user.npid })),
})

export const fetchRoomsAll =  async (): Promise<RoomsData> => {
  const data = await GET<RoomsResponse>(API.rooms().path);

  const groups: RoomGroups = {}
  const entries = Object.entries(data)
    .filter(([, v]) => Array.isArray(v))
    // shuffle 1p 2p
    .sort(() => Math.random() - 0.5)
  for (const [key, rooms] of entries) {
    if (key === 'rank_match') {
      groups.rank_match = data.rank_match?.map(toRoom) ?? []
    } else {
      groups[key] = rooms.map(toRoom)
    }
  }

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
