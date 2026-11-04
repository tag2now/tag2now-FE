/** One opponent of a player, with that player's record against them. */
export interface OpponentRecord {
  npid: string
  online_name: string
  match_count: number
  wins: number
  losses: number
}

export interface PlayerHistory {
  npid: string
  days_active: number
  times_seen: number
  first_seen: string | null
  last_seen: string | null
  room_type_counts: Record<string, number>
  active_hours: number[]
}
