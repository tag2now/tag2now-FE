import { POST } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import { startSession } from '@/auth/session'
import type { AuthUser, LoginResponse } from '@/auth/types'

/** Sign in with an RPCN account. The backend checks the password with RPCN and
 * answers with a bearer token, which every later request carries. */
export async function login(username: string, password: string): Promise<AuthUser> {
  const result: LoginResponse = await POST(API.login().path, { username, password })
  return startSession(result.access_token, result.expires_in, result.user).user
}
