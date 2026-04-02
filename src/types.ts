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
  np_id: string
  online_name: string
  avatar_url: string
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

// Community types
export interface PostSummary {
  id: number
  author: string
  title: string
  body: string
  post_type: string
  thumbs_up: number
  thumbs_down: number
  created_at: string
  comment_count: number
}

export interface PostListResponse {
  posts: PostSummary[]
  total: number
  page: number
  page_size: number
}

export interface CommentOut {
  id: number
  post_id: number
  parent_id: number | null
  author: string
  body: string
  created_at: string
  replies: CommentOut[]
}

export interface PostDetail {
  id: number
  author: string
  title: string
  body: string
  post_type: string
  thumbs_up: number
  thumbs_down: number
  created_at: string
  comments: CommentOut[]
}

// Stats/History types
export interface HourlyActivity {
  hour: number
  avg_players: number
  peak_players: number
}

export interface DailySummary {
  date: string
  peak_players: number
  avg_players: number
  peak_rooms?: number
  avg_rooms?: number
}

// Weekly top / player history types
export interface WeeklyTopPlayer {
  npid: string
  online_name: string
  match_count: number
}

export interface PlayerHistoryCoPlayer {
  npid: string
  online_name: string
  times_together: number
}

export interface PlayerHistory {
  npid: string
  days_active: number
  times_seen: number
  first_seen: string | null
  last_seen: string | null
  room_type_counts: Record<string, number>
  top_played_with: PlayerHistoryCoPlayer[]
  active_hours: number[]
}

// Hook return type
export interface PolledState<T> {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}
