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
