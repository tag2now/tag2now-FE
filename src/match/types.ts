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

/** A player to play now at a rank, from tag2now-BE's `GET /saves/current-rank-holders`. */
export interface CurrentRankHolder {
  username: string
  /** ISO 8601, UTC: when the game last wrote the save. */
  saved_at: string
  account_rank: number
  /** The characters they have played at the asked rank. */
  chars: { id: number, character: string }[]
}

/** Who played a character now at `rank` within the last 30 days, lowest on the
 * current-rank leaderboard first: a strong player's other characters are
 * lifted by rank correction, and these are the players who belong there. */
export interface CurrentRankHolders {
  rank: number
  rank_name: string
  /** Everyone found, of whom `entries` are the first hundred. */
  total: number
  entries: CurrentRankHolder[]
}
