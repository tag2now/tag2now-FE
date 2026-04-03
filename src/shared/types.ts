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