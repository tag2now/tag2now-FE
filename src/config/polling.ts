/** How often each polled source is refetched, in one place.
 *
 * These were file-local constants in each feature hook, which made "how hard
 * does this client hit the backend?" a question you had to open six files to
 * answer. Now it is this table.
 *
 * `null` means fetch once with no interval — `usePolledData` reads it that way.
 */
export const POLL = {
  /** Rooms are the only genuinely live figure on the site: a lobby opens and
   * fills within a minute, so anything slower shows the user a room that is
   * already gone. */
  rooms: 5_000,

  /** Reservations are scheduled minutes-to-hours ahead, so the sidebar badge
   * only needs to be honest, not instant. */
  reservationsBackground: 60_000,

  /** While the reservation tab is open the user is watching a roster fill, so
   * the same single poll speeds up rather than a second one starting alongside
   * it. App swaps between this and the background rate by active tab. */
  reservationsActive: 10_000,

  /** The leaderboard is recomputed on the backend far more slowly than a
   * session lasts, and a manual refresh is offered in the panel. */
  leaderboard: null,

  /** The overview is a snapshot with a manual refresh: the only live number on
   * it is the room count, which arrives as a prop from App's own rooms poll. */
  overview: null,
} as const
