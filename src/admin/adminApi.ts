import { POST } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import type { AccountStatus, BanResult } from '@/admin/types'

/* Both calls carry the admin's own password: RPCN checks it again on every
 * action, and the backend keeps none. A wrong one answers 400, not 401, so it
 * never ends the session. */

export const lookupAccount = (username: string, password: string): Promise<AccountStatus> =>
  POST(API.adminLookup().path, { username, password })

export const banAccount = (username: string, password: string): Promise<BanResult> =>
  POST(API.adminBan().path, { username, password })
