// Room types
/** A broadcast a room user is on air with, on the channel they registered. */
export interface LiveStream {
  platform: string
  channel_name: string
  url: string
  title: string
  viewer_count: number
}

export interface RoomUser {
  np_id: string
  online_name: string
  avatar_url: string
  /** null when not live; absent from a backend that predates streams. */
  stream?: LiveStream | null
}

export interface RoomRankInfo {
  id: number
  name: string
  tier: string
}

export interface Room {
  room_id: string | number
  owner_online_name?: string
  rank_info?: RoomRankInfo | null
  max_slots?: number
  users: RoomUser[]
}

export interface RankMatchRoom extends Room {
  rank_info: RoomRankInfo
}

export interface RoomsData {
  groups: Record<string, Room[]>
  total: number
  totalUsers: number
}