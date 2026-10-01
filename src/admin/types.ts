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

/** One character slot of a TTT2 save. `rank_name` and `tier` are the backend's. */
export type SaveChar = {
  id: number
  character: string
  rank: number
  rank_name: string
  tier: string
  points: number
  /** Negative for a losing streak. */
  streak: number
  wins: number
  losses: number
}

/** A player's TTT2 save, as `POST /admin/saves/show` returns it. */
export type SaveInfo = {
  username: string
  data_id: number
  /** ISO 8601, UTC: when the game last wrote it. */
  saved_at: string
  /** Send back as expect_sha256 to write; changes whenever the game saves. */
  sha256: string
  checksum_ok: boolean
  account_rank: number
  /** The account rank's gauge, out of 11. */
  progress: number
  total: number
  wins: number
  losses: number
  /** In RPCS3 right now; null when RPCN cannot say. */
  online: boolean | null
  chars: SaveChar[]
}

export type SaveBackup = {
  label: string
  /** Null for a backup file of the wrong size. */
  total: number | null
  account_rank: number | null
}

export type SaveAuditRecord = {
  ts: string
  /** The admin for edits made here, the shell user for the command line. */
  user: string
  action: string
  username: string
  details: Record<string, unknown>
}

export type SlotState = { rank: number, rank_name: string, points: number, streak: number }

export type SaveChanges = {
  account_rank: { before: number, after: number } | null
  chars: { id: number, character: string, before: SlotState, after: SlotState }[]
}

export type SaveFloor = {
  reached: number
  floor: number
  raised: number
  points_fixed: number
  /** A few characters below the floor that an earlier floor explains as demotions. */
  likely_demoted: boolean
}

/** A preview (`applied: false`) or a write, from any of the four edit routes. */
export type SaveWriteResult = {
  username: string
  /** The save before the change. */
  sha256: string
  online: boolean | null
  changes: SaveChanges
  applied: boolean
  result: { backup: string, checksum: string, data_id: number, landed: boolean } | null
  floor?: SaveFloor
}

/** What an edit asks for, minus the account and the password. */
export type SaveEdit =
  | { action: 'set-rank', char: number | 'all', rank: number, points?: number }
  | { action: 'set-account-rank', rank: number }
  | { action: 'floor', rank?: number, fix_points: boolean, refloor: boolean }
  | { action: 'restore', label: string }
