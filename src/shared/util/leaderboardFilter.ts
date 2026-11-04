import type { CharInfo, LeaderboardEntry } from '@/shared/types'
import { TIER_HEX } from '@/shared/tierColors'
import { indexOfRank } from '@/shared/ranks'

/** Rows left when the user collapses the board. */
export const COLLAPSED_VISIBLE = 100

export type SortKey = 'rank' | 'winRate' | 'matches'

export interface LeaderboardQuery {
  search: string
  character: string
  /** Rank band, matched against either character's tier. '' is every band. */
  tier: string
  sort: SortKey
  collapsed: boolean
}

const charNames = (entry: LeaderboardEntry): string[] =>
  [entry.player_info?.main_char_info?.name, entry.player_info?.sub_char_info?.name]
    .filter((name): name is string => Boolean(name))

const tiers = (entry: LeaderboardEntry): string[] =>
  [entry.player_info?.main_char_info?.rank_info?.tier, entry.player_info?.sub_char_info?.rank_info?.tier]
    .filter((tier): tier is string => Boolean(tier))

const matchesSearch = (entry: LeaderboardEntry, search: string): boolean =>
  entry.online_name.toLowerCase().includes(search)

const matchesCharacter = (entry: LeaderboardEntry, character: string): boolean =>
  charNames(entry).includes(character)

const matchesTier = (entry: LeaderboardEntry, tier: string): boolean =>
  tiers(entry).includes(tier)

/** Every band present on the board, ordered the way the game promotes through
 * them. Derived rather than hard-coded so a band the API adds simply appears. */
export function tiersPresent(entries: LeaderboardEntry[]): string[] {
  const order = Object.keys(TIER_HEX)
  const found = new Set(entries.flatMap(tiers))
  const known = order.filter((tier) => found.has(tier))
  const unknown = [...found].filter((tier) => !order.includes(tier)).sort()
  return [...known, ...unknown]
}

const rankOf = (char: CharInfo | null | undefined): number => indexOfRank(char?.rank_info?.name ?? '')

/** The higher-ranked character's record, which the sorts compare. A tag match counts for both
 * characters, so adding them counts it twice; neither board carries the account's own record. */
export function higherRankRecord(entry: LeaderboardEntry): { wins: number, losses: number, matches: number, winRate: number | null } {
  const main = entry.player_info?.main_char_info
  const sub = entry.player_info?.sub_char_info
  const char = rankOf(sub) > rankOf(main) ? sub : main ?? sub
  const wins = char?.wins ?? 0
  const losses = char?.losses ?? 0
  const matches = wins + losses
  return { wins, losses, matches, winRate: matches > 0 ? wins / matches : null }
}

/** Ordering for a chosen column.
 *
 * A player with no recorded matches has no win rate, and treating that as 0%
 * would bury them under everyone who has lost a game — so they sort last on
 * that column rather than at the bottom of the percentages. Ties fall back to
 * board rank, which keeps the order stable between renders.
 */
function compare(a: LeaderboardEntry, b: LeaderboardEntry, sort: SortKey): number {
  if (sort === 'rank') return a.rank - b.rank
  const left = higherRankRecord(a)
  const right = higherRankRecord(b)
  if (sort === 'matches') return (right.matches - left.matches) || (a.rank - b.rank)
  if (left.winRate === null || right.winRate === null) {
    if (left.winRate === right.winRate) return a.rank - b.rank
    return left.winRate === null ? 1 : -1
  }
  return (right.winRate - left.winRate) || (a.rank - b.rank)
}

/**
 * Narrow and order the board for display.
 *
 * Collapsing is an opt-in view of the top ranks. A search or any filter always
 * runs against the whole board regardless, so a player looked up by name is
 * findable whether or not the board happens to be collapsed — and collapsing
 * applies after the sort, so "top 100 by win rate" means what it says rather
 * than "the first hundred by rank, reordered".
 */
export function filterEntries(entries: LeaderboardEntry[], query: LeaderboardQuery): LeaderboardEntry[] {
  const search = query.search.trim().toLowerCase()
  const filtering = search !== '' || query.character !== '' || query.tier !== ''

  const matched = filtering
    ? entries.filter((entry) => {
        if (search && !matchesSearch(entry, search)) return false
        if (query.character && !matchesCharacter(entry, query.character)) return false
        return !query.tier || matchesTier(entry, query.tier)
      })
    : entries

  const ordered = query.sort === 'rank' ? matched : [...matched].sort((a, b) => compare(a, b, query.sort))

  if (filtering) return ordered
  return query.collapsed ? ordered.slice(0, COLLAPSED_VISIBLE) : ordered
}
