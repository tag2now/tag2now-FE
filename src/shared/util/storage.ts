/** Every localStorage key this app writes, and the only place they are built.
 *
 * They were spread across three modules with three different naming shapes,
 * so nothing could answer "what does this site keep on my machine?" — which is
 * exactly the question a reset or a privacy note has to answer. `clearAll` is
 * possible only because the keys are enumerable from here.
 *
 * Reservation ownership is a capability model, not an account: holding the
 * token *is* the permission. Clearing this store therefore genuinely forfeits
 * the ability to delete a reservation, and nothing can recover it.
 */

const PREFIX = {
  reservationOwner: 'reservation-owner-',
  reservationParticipant: 'reservation-participant-',
  reservationComment: 'reservation-comment-',
} as const

/** The literal strings are load-bearing: they are already in users' browsers.
 * Renaming one silently logs everybody out of their display name, or re-shows
 * the patch dialog to people who dismissed it. `e2e/helpers` writes the patch
 * key directly too, so it is a contract with the test suite as well. */
export const STORAGE_KEYS = {
  /** The patch-notes version last dismissed. */
  seenPatchVersion: 'ttt2-patch-dismissed',
  /** The community display name, mirrored from the cookie. */
  username: 'ttt2-username',
} as const

export const reservationOwnerKey = (id: number) => `${PREFIX.reservationOwner}${id}`
export const reservationParticipantKey = (id: number) => `${PREFIX.reservationParticipant}${id}`
export const reservationCommentKey = (id: number) => `${PREFIX.reservationComment}${id}`

/** Reads that must not throw: Safari private mode and "block site data" both
 * make localStorage itself throw on access, and a missing token is the same
 * answer as a storage we cannot read — neither grants the capability. */
export function readToken(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeToken(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // A browser that refuses the write leaves the caller without the capability
    // it just earned. That is a worse outcome than the write succeeding, but it
    // is not one the caller can act on, and throwing here would roll back a
    // reservation the backend has already created.
  }
}

export function removeToken(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Same reasoning as writeToken: nothing useful to do about it.
  }
}

/** Everything this app stored, for a reset. */
export function clearAll(): void {
  try {
    const prefixes = Object.values(PREFIX)
    const named: string[] = Object.values(STORAGE_KEYS)
    const doomed = Object.keys(localStorage).filter(
      (key) => named.includes(key) || prefixes.some((prefix) => key.startsWith(prefix)),
    )
    doomed.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Nothing to clear if the store cannot be read.
  }
}
