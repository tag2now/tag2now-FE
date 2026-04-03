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
