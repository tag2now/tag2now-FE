export interface DailySummary {
  date: string
  peak_players: number | null
  avg_players: number | null
  unique_players?: number
  peak_rooms?: number
  avg_rooms?: number
}

export interface WeeklyTopPlayer {
  npid: string
  online_name: string
  /** Only matches both players' saves confirmed. */
  match_count: number
  wins: number
  losses: number
}
