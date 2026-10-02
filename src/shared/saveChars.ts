/** A TTT2 save's characters, as the admin page and every profile draw them. */

/** One character slot of a TTT2 save. `rank_name` and `tier` are the backend's. */
export type SaveChar = {
  id: number
  character: string
  rank: number
  rank_name: string
  tier: string
  points: number
  /** Negative for a losing streak. */
  streak: number
  wins: number
  losses: number
}

/** Anyone's TTT2 save, as `GET /saves/players/{npid}` returns it: ranks and
 * records only, and up to ten minutes behind the game. */
export type PlayerSave = {
  username: string
  /** ISO 8601, UTC: when the game last wrote it. */
  saved_at: string
  account_rank: number
  total: number
  wins: number
  losses: number
  /** The characters the player has used, by save slot. */
  chars: SaveChar[]
}

/** A slot with a rank or a match played. */
export const isUsed = (char: SaveChar) => char.rank > 0 || char.wins + char.losses > 0

/** Highest rank first; within a rank, more points, then more matches played. */
export const byRank = (a: SaveChar, b: SaveChar) =>
  b.rank - a.rank || b.points - a.points || (b.wins + b.losses) - (a.wins + a.losses) || a.id - b.id

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

/* The backend and the save tool both name slot 0x33 "Michelle" a second time
 * (0x2E is the first). The grid has one Michelle and one face no slot is named
 * after, Angel, so that is the face slot 0x33 gets. Not yet confirmed in game. */
export const ANGEL_SLOT = 0x33

/** The face the grid and the tables draw for a slot. */
export const faceOf = (char: { id: number, character: string }) => (char.id === ANGEL_SLOT ? 'Angel' : char.character)
