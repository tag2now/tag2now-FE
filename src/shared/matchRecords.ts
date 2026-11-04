/** Finished rank matches, as tag2now-BE's `/records` routes return them.
 *
 * A match is found in the saves and its opponent in the rooms (BE spec 11), so
 * either half can be missing: a player with no save has no characters, and a
 * match with no room has no opponent at all. */

export type RecordChar = {
  name: string
  /** The rank the character held going into the match; null on matches recorded before ranks were kept. */
  rank: { name: string; tier: string } | null
}

export type RecordPlayer = {
  npid: string
  /** From the room the match was played in; null when no room was found. */
  online_name: string | null
  result: 'win' | 'loss'
  /** In tag order when known; null when that player's save was not seen. */
  chars: RecordChar[] | null
}

export type MatchRecord = {
  /** The cursor `before` pages by. */
  id: number
  /** ISO 8601, UTC: when the result was saved. */
  played_at: string
  /** The match's sides: 1P, then 2P as RPCN's room slots placed them. */
  p1: RecordPlayer
  /** Null when no room named the opponent. */
  p2: RecordPlayer | null
}

/** `GET /records/matches`. `next_before` is null on the last page. */
export type MatchRecordPage = {
  matches: MatchRecord[]
  next_before: number | null
}

export const playerName = (player: RecordPlayer) => player.online_name ?? player.npid
