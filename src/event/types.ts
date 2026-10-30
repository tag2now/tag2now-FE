export interface EventRank {
  rank: number
  name: string
  tier: string
}

export interface EventChar {
  id: number
  character: string
}

export interface EventAchiever {
  place: number
  username: string
  /** Ranks climbed from where the rules started that character. */
  gain: number
  main: boolean
  char: EventChar
  from_rank: EventRank
  to_rank: EventRank
  /** The organiser's call, not the rules': the board only marks them. */
  new_player: boolean
  number_only: boolean
}

export interface EventBoard {
  start_at: string
  end_at: string | null
  ended: boolean
  capacity: number
  achievers: EventAchiever[]
}

export interface EventSlot {
  char: EventChar
  main: boolean
  start: EventRank
  target: EventRank
  rank: EventRank
  achieved: boolean
}

export interface EventPlayer {
  username: string
  top_rank: EventRank
  best_rank: EventRank
  main_steps: number
  sub_steps: number
  sub_floor: EventRank
  achieved: boolean
  place: number | null
  new_player: boolean
  number_only: boolean
  slots: EventSlot[]
}
