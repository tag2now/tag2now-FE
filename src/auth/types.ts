/** The signed-in RPCN account, as `POST /auth/login` returns it.
 *
 * `username` is the account id --- unique, unchangeable, and the same string
 * the leaderboard reports as `np_id`. Everything that asks "is this mine?"
 * compares it. `online_name` is only ever displayed.
 */
export type AuthUser = {
  username: string
  online_name: string
  avatar_url: string
  admin: boolean
}

/** Whether `user` may delete what `author` wrote: its author, or any admin.
 * Mirrors the backend's comment-deletion rules, which are the authority. */
export const isAuthorOrAdmin = (author: string | null, user: AuthUser | null): boolean =>
  user != null && (author === user.username || user.admin)

export type LoginResponse = {
  access_token: string
  token_type: 'bearer'
  /** Seconds. */
  expires_in: number
  user: AuthUser
}
