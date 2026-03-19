// Leaderboard types
export interface CharRankInfo {
  name: string
  tier: string
}

export interface CharInfo {
  name: string
  rank_info?: CharRankInfo
  wins?: number
  losses?: number
}

export interface PlayerInfo {
  main_char_info?: CharInfo | null
  sub_char_info?: CharInfo | null
}

export interface LeaderboardEntry {
  np_id: string
  rank: number
  online_name: string
  player_info?: PlayerInfo | null
}

export interface LeaderboardData {
  total_records: number
  entries: LeaderboardEntry[]
}

// Room types
export interface RoomUser {
  online_name: string
  user_id?: string
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
  users?: RoomUser[]
}

export interface RoomsData {
  groups: Record<string, Room[]>
  total: number
  totalUsers: number
}

// Hook return type
export interface PolledState<T> {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => void
}
