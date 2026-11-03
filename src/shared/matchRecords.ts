/** Finished rank matches, as tag2now-BE's `/records` routes return them.
 *
 * A match is found in the saves and its opponent in the rooms (BE spec 11), so
 * either half can be missing: a side with no save has no characters, and a
 * match with no room has no opponent at all. */

export type RecordChar = {
  name: string
  /** The rank the character held going into the match; null on matches recorded before ranks were kept. */
  rank: { name: string; tier: string } | null
}

export type RecordSide = {
  npid: string
  /** From the room the match was played in; null when no room was found. */
  online_name: string | null
  /** In tag order when known; null when that side's save was not seen. */
  chars: RecordChar[] | null
}

export type MatchRecord = {
  /** The cursor `before` pages by. */
  id: number
  /** ISO 8601, UTC: when the result was saved. */
  played_at: string
  winner: RecordSide | null
  loser: RecordSide | null
}

/** `GET /records/matches`. `next_before` is null on the last page. */
export type MatchRecordPage = {
  matches: MatchRecord[]
  next_before: number | null
}

/** `GET /records/players/{npid}`: their matches, and the totals since collection began. */
export type PlayerRecordPage = MatchRecordPage & {
  npid: string
  wins: number
  losses: number
}

export const sideName = (side: RecordSide) => side.online_name ?? side.npid
