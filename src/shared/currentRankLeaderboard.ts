/** The current-rank board: players by the ranks their saves hold now. */
import type { SaveChar } from '@/shared/saveChars'
import type { CharInfo, LeaderboardData, LeaderboardEntry } from '@/shared/types'

/** One player, as `GET /saves/leaderboard` returns them. */
export type CurrentRankLeaderboardEntry = {
  /** Place; players whose two characters stand equal share it (1, 2, 2, 4). */
  rank: number
  username: string
  /** ISO 8601, UTC: when the game last wrote the save. */
  saved_at: string
  account_rank: number
  /** The two highest characters, by rank then points; one when only one is ranked. */
  chars: SaveChar[]
}

export type CurrentRankLeaderboard = {
  total: number
  entries: CurrentRankLeaderboardEntry[]
}

const charInfo = (char: SaveChar | undefined): CharInfo | null =>
  char ? { name: char.character, rank_info: { name: char.rank_name, tier: char.tier }, wins: char.wins, losses: char.losses } : null

/** The board in the score board's shape, so one Leaderboard draws both: the
 * highest character goes in the main slot, the second in the sub. A save knows
 * only the RPCN id, so the online name is joined in from the score board, and a
 * player missing there shows their id. */
export function toLeaderboardData(board: CurrentRankLeaderboard, named: LeaderboardEntry[] = []): LeaderboardData {
  const names = new Map(named.map((e) => [e.np_id, e.online_name]))
  return {
    total_records: board.total,
    entries: board.entries.map((e) => ({
      np_id: e.username,
      rank: e.rank,
      online_name: names.get(e.username) ?? e.username,
      player_info: { main_char_info: charInfo(e.chars[0]), sub_char_info: charInfo(e.chars[1]) },
    })),
  }
}
