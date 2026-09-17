/** Every backend path this frontend calls, in one place.
 *
 * Before this existed the paths were string literals spread across seven
 * modules, and `history/stats/daily` was written twice — once in the stats hook
 * and once in the overview's batch. A backend rename therefore had to be
 * chased through grep rather than through the type system.
 *
 * The template functions take the same arguments the callers already had, so a
 * call site reads no differently; what changes is that `contract.test.ts` can
 * now enumerate this object and assert that nothing here is missing from the
 * contract list (and nothing in that list is dead).
 *
 * `openapiPath` is the OpenAPI template the path resolves to. It is what makes
 * that cross-check possible: `reservations/12/comments` cannot be looked up in
 * the schema, but `/reservations/{reservation_id}/comments` can.
 */

export type Endpoint = {
  /** Path passed to GET/POST/PATCH/DELETE — no leading slash, they add the base. */
  path: string
  /** The OpenAPI path template this resolves to, with a leading slash. */
  openapiPath: string
}

const fixed = (path: string): Endpoint => ({ path, openapiPath: `/${path}` })

const templated = (path: string, openapiPath: string): Endpoint => ({ path, openapiPath })

export const API = {
  rooms: () => fixed('rooms/all'),
  leaderboard: () => fixed('leaderboard'),

  stats: () => fixed('history/stats'),
  dailyStats: () => fixed('history/stats/daily'),
  weeklyTop: () => fixed('history/stats/weekly-top'),
  playerHistory: (npid: string) =>
    templated(`history/players/${npid}`, '/history/players/{npid}'),

  communityIdentity: () => fixed('community/identity'),
  posts: () => fixed('community/posts'),
  post: (postId: number) =>
    templated(`community/posts/${postId}`, '/community/posts/{post_id}'),
  postComments: (postId: number) =>
    templated(`community/posts/${postId}/comments`, '/community/posts/{post_id}/comments'),
  postThumb: (postId: number) =>
    templated(`community/posts/${postId}/thumb`, '/community/posts/{post_id}/thumb'),

  reservations: () => fixed('reservations'),
  reservation: (id: number) =>
    templated(`reservations/${id}`, '/reservations/{reservation_id}'),
  reservationParticipants: (id: number) =>
    templated(`reservations/${id}/participants`, '/reservations/{reservation_id}/participants'),
  ownParticipation: (id: number) =>
    templated(`reservations/${id}/participants/me`, '/reservations/{reservation_id}/participants/me'),
  reservationComments: (id: number) =>
    templated(`reservations/${id}/comments`, '/reservations/{reservation_id}/comments'),
  reservationComment: (reservationId: number, commentId: number) =>
    templated(
      `reservations/${reservationId}/comments/${commentId}`,
      '/reservations/{reservation_id}/comments/{comment_id}',
    ),
} as const

/** The OpenAPI templates this frontend calls, for the contract test to check
 * against its hand-written expectations. Sample arguments are arbitrary — only
 * the template each function returns is read. */
export const openapiPaths = (): string[] => {
  const samples: Record<keyof typeof API, unknown[]> = {
    rooms: [], leaderboard: [], stats: [], dailyStats: [], weeklyTop: [],
    playerHistory: ['npid'], communityIdentity: [], posts: [], post: [1],
    postComments: [1], postThumb: [1], reservations: [], reservation: [1],
    reservationParticipants: [1], ownParticipation: [1],
    reservationComments: [1], reservationComment: [1, 2],
  }
  return Object.entries(API).map(([key, build]) =>
    (build as (...args: unknown[]) => Endpoint)(...samples[key as keyof typeof API]).openapiPath,
  )
}
