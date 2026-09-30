/** An RPCN account's standing, as `POST /admin/users/lookup` returns it. */
export type AccountStatus = {
  username: string
  online_name: string
  avatar_url: string
  admin: boolean
  banned: boolean
  /** In RPCS3 right now, not on this site. */
  online: boolean
  /** ISO 8601, UTC. Null for accounts older than RPCN's timestamp table. */
  created_at: string | null
  last_login_at: string | null
}

export type BanResult = {
  username: string
  banned: true
  /** Whether the account was in-game and got disconnected. */
  kicked: boolean
}
