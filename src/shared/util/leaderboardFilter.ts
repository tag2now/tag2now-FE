import type { LeaderboardEntry } from '@/shared/types'

/** Rows left when the user collapses the board. */
export const COLLAPSED_VISIBLE = 100

export interface LeaderboardQuery {
  search: string
  character: string
  collapsed: boolean
}

const charNames = (entry: LeaderboardEntry): string[] =>
  [entry.player_info?.main_char_info?.name, entry.player_info?.sub_char_info?.name]
    .filter((name): name is string => Boolean(name))

const matchesSearch = (entry: LeaderboardEntry, search: string): boolean =>
  entry.online_name.toLowerCase().includes(search)

const matchesCharacter = (entry: LeaderboardEntry, character: string): boolean =>
  charNames(entry).includes(character)

/**
 * Narrow the board for display.
 *
 * The whole board shows by default; collapsing is an opt-in convenience for
 * anyone who only cares about the top ranks. A search or character filter always
 * runs against the whole board regardless, so a player looked up by name is
 * findable whether or not the board happens to be collapsed.
 */
export function filterEntries(entries: LeaderboardEntry[], query: LeaderboardQuery): LeaderboardEntry[] {
  const search = query.search.trim().toLowerCase()
  const isFiltering = search !== '' || query.character !== ''
  if (!isFiltering) return query.collapsed ? entries.slice(0, COLLAPSED_VISIBLE) : entries

  return entries.filter((entry) => {
    if (search && !matchesSearch(entry, search)) return false
    return !query.character || matchesCharacter(entry, query.character)
  })
}
