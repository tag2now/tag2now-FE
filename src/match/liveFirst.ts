import type { RoomUser } from '@/match/types'

/** The same players with whoever is live on Chzzk moved to the front, so the
 * LIVE badge a viewer is scanning for sits in the left-hand slot. Stable: among
 * players who are both live, or both not, the payload's order stands. */
export function liveFirst(users: RoomUser[]): RoomUser[] {
  return [...users].sort((a, b) => Number(!!b.stream) - Number(!!a.stream))
}
