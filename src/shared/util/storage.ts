/** Every localStorage key this app writes, and the only place they are built.
 *
 * They were spread across three modules with three different naming shapes,
 * so nothing could answer "what does this site keep on my machine?" — which is
 * exactly the question a reset or a privacy note has to answer. `clearAll` is
 * possible only because the keys are enumerable from here.
 */

/** The literal strings are load-bearing: they are already in users' browsers.
 * Renaming one silently signs everybody out, or re-shows the patch dialog to
 * people who dismissed it. `e2e/helpers` writes both directly too, so they are
 * a contract with the test suite as well. */
export const STORAGE_KEYS = {
  /** The patch-notes version last dismissed. */
  seenPatchVersion: 'ttt2-patch-dismissed',
  /** The signed-in RPCN account: access token, its expiry, and the user. */
  session: 'ttt2-session',
} as const

/** Keys earlier builds wrote and nothing reads any more: the typed-in display
 * name, and the per-reservation capability tokens that stood in for accounts
 * before login existed. Listed so a reset can still find them. */
const LEGACY = {
  username: 'ttt2-username',
  prefixes: ['reservation-owner-', 'reservation-participant-', 'reservation-comment-'],
} as const

/** Reads that must not throw: Safari private mode and "block site data" both
 * make localStorage itself throw on access, and an unreadable store is the
 * same answer as an empty one. */
export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // A browser that refuses the write keeps the value for this page only.
    // Throwing here would fail a login the server has already granted.
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing useful to do about it.
  }
}

/** Everything this app stored, for a reset. */
export function clearAll(): void {
  try {
    const named: string[] = [...Object.values(STORAGE_KEYS), LEGACY.username]
    const doomed = Object.keys(localStorage).filter(
      (key) => named.includes(key) || LEGACY.prefixes.some((prefix) => key.startsWith(prefix)),
    )
    doomed.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Nothing to clear if the store cannot be read.
  }
}
