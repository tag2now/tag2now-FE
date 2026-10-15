/** Every backend path this frontend calls, in one place.
 *
 * Before this existed the paths were string literals spread across seven
 * modules, and `history/stats/daily` was written twice — once in the stats hook
 * and once in the overview's batch. A backend rename therefore had to be
 * chased through grep rather than through the type system.
 *
 * The template functions take the same arguments the callers already had, so a
 * call site reads no differently.
 */

export type Endpoint = {
  /** Path passed to GET/POST/PUT/PATCH/DELETE — no leading slash, they add the base. */
  path: string
}

const endpoint = (path: string): Endpoint => ({ path })

export const API = {
  login: () => endpoint('auth/login'),

  adminLookup: () => endpoint('admin/users/lookup'),
  adminBan: () => endpoint('admin/users/ban'),
  adminSaveShow: () => endpoint('admin/saves/show'),
  adminSaveBackups: () => endpoint('admin/saves/backups'),
  adminSaveLog: () => endpoint('admin/saves/log'),
  adminSaveSetRank: () => endpoint('admin/saves/set-rank'),
  adminSaveSetAccountRank: () => endpoint('admin/saves/set-account-rank'),
  adminSaveFloor: () => endpoint('admin/saves/floor'),
  adminSaveRestore: () => endpoint('admin/saves/restore'),
  adminStreams: () => endpoint('admin/streams'),
  adminStream: (username: string) => endpoint(`admin/streams/${encodeURIComponent(username)}`),

  rooms: () => endpoint('rooms/all'),
  myStream: () => endpoint('streams/me'),
  leaderboard: () => endpoint('leaderboard'),

  stats: () => endpoint('history/stats'),
  dailyStats: () => endpoint('history/stats/daily'),
  weeklyTop: () => endpoint('history/stats/weekly-top'),
  playerHistory: (npid: string) => endpoint(`history/players/${npid}`),
  playerSave: (npid: string) => endpoint(`saves/players/${npid}`),

  posts: () => endpoint('community/posts'),
  post: (postId: number) => endpoint(`community/posts/${postId}`),
  postComments: (postId: number) => endpoint(`community/posts/${postId}/comments`),
  postThumb: (postId: number) => endpoint(`community/posts/${postId}/thumb`),

  reservations: () => endpoint('reservations'),
  reservation: (id: number) => endpoint(`reservations/${id}`),
  reservationParticipants: (id: number) => endpoint(`reservations/${id}/participants`),
  ownParticipation: (id: number) => endpoint(`reservations/${id}/participants/me`),
  reservationComments: (id: number) => endpoint(`reservations/${id}/comments`),
  reservationComment: (reservationId: number, commentId: number) => endpoint(`reservations/${reservationId}/comments/${commentId}`),

  chatStream: () => endpoint('chat/stream'),
  chatMessages: () => endpoint('chat/messages'),
  chatMessage: (id: number) => endpoint(`chat/messages/${id}`),
} as const
