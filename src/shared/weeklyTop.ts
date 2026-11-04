import type { RankRow } from '@/shared/components/RankList'
import type { WeeklyTopPlayer } from '@/shared/activityTypes'
import type { LeaderboardEntry } from '@/shared/types'

/** The weekly ranking's rows, for both the stats tab and the home card, so the
 * two read the same way. The endpoint knows matches, not characters, so the
 * portraits are joined in from the leaderboard by npid; a player outside it
 * simply has none. */
export function weeklyTopRows(players: WeeklyTopPlayer[], entries: LeaderboardEntry[]): RankRow[] {
  const byNpid = new Map(entries.map((e) => [e.np_id, e]))
  return players.map((p) => {
    const entry = byNpid.get(p.npid)
    return {
      key: p.npid,
      npid: p.npid,
      name: p.online_name,
      detail: `${p.match_count}판`,
      // No overall place behind it: the record alone fills the detail track.
      detailSub: `${p.wins}승 ${p.losses}패`,
      mainChar: entry?.player_info?.main_char_info,
      subChar: entry?.player_info?.sub_char_info,
    }
  })
}
