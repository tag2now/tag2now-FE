import { GROUP_ORDER } from '@/config/tabConfig'

/** Tab keys that address a fixed panel. Room groups are the open-ended rest:
 * a group the API adds later is a room tab without this file changing. */
export const FIXED_TABS = ['overview', 'reservation', 'leaderboard', 'community', 'stats'] as const

export type FixedTab = typeof FIXED_TABS[number]

export const isRoomTab = (tab: string): boolean => !FIXED_TABS.includes(tab as FixedTab)

/** The overview is the landing panel, so it owns "/" rather than "/overview" —
 * a shared root link has to open the same screen the site opens on. */
const TAB_PATHS: Record<FixedTab, string> = {
  overview: '/',
  reservation: '/reservation',
  leaderboard: '/leaderboard',
  community: '/community',
  stats: '/stats',
}

/** The single answer to "what URL is this tab?", used by the nav, the section
 * links, and the tests alike so none of them can drift apart. */
export function pathOf(tab: string): string {
  return TAB_PATHS[tab as FixedTab] ?? `/match/${tab}`
}

/** The match tab has no landing page of its own — it opens on a group. */
export const firstRoomPath = (groupKeys: string[]): string =>
  pathOf(groupKeys[0] ?? GROUP_ORDER[0])

export const postPath = (id: number): string => `/community/${id}`
export const reservationPath = (id: number): string => `/reservation/${id}`
