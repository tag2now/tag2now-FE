import { afterEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, POST } from './api'
import { dismissLoginRequest, endSession, getLoginRequest, getSession, startSession } from '@/auth/session'

function respondWith(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  }))
}

describe('api error handling', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('surfaces the message the API sent', async () => {
    respondWith(400, { detail: '랭크매치는 보유 계급을 하나 이상 선택해야 합니다.' })

    await expect(GET('reservations')).rejects.toThrow('랭크매치는 보유 계급을 하나 이상 선택해야 합니다.')
  })

  it('surfaces schema violations the same way', async () => {
    respondWith(422, { detail: '예상 시간 값을 확인해 주세요.' })

    await expect(GET('reservations')).rejects.toThrow('예상 시간 값을 확인해 주세요.')
  })

  it('falls back to the status when the body carries no detail', async () => {
    respondWith(500, { message: 'boom' })

    await expect(GET('reservations')).rejects.toThrow('request failed: 500')
  })

  it('falls back to the status when the body is not json', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError('Unexpected token') },
    }))

    await expect(GET('reservations')).rejects.toThrow('request failed: 502')
  })

  it('reports DELETE failures with the same message', async () => {
    respondWith(403, { detail: '참가 취소 권한이 없습니다.' })

    await expect(DELETE('reservations/1/participants/me')).rejects.toThrow('참가 취소 권한이 없습니다.')
  })
})

describe('the bearer token', () => {
  const user = { username: 'p1', online_name: '철권', avatar_url: '', admin: false }

  afterEach(() => {
    vi.unstubAllGlobals()
    endSession()
    dismissLoginRequest()
  })

  const sentHeaders = () => new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers)

  it('is not sent while signed out', async () => {
    respondWith(200, [])

    await GET('reservations')

    expect(sentHeaders().has('Authorization')).toBe(false)
  })

  it('rides every request once signed in, writes included', async () => {
    startSession('tok', 3600, user)
    respondWith(200, {})

    await POST('reservations', { memo: '' })

    expect(sentHeaders().get('Authorization')).toBe('Bearer tok')
    expect(sentHeaders().get('Content-Type')).toBe('application/json')
  })

  it('is dropped when the server refuses it, and the login dialog asks again', async () => {
    startSession('tok', 3600, user)
    respondWith(401, { detail: '로그인이 만료되었습니다. 다시 로그인해 주세요.' })

    await expect(DELETE('reservations/1')).rejects.toThrow('로그인이 만료되었습니다. 다시 로그인해 주세요.')

    expect(getSession()).toBeNull()
    expect(getLoginRequest()).toEqual({ reason: '로그인이 만료되었습니다. 다시 로그인해 주세요.' })
  })

  it('leaves the session alone when a 401 answers a request that carried no token', async () => {
    // A wrong password on /auth/login is a 401 too; it says nothing about a
    // session, and must not open a second dialog over the first.
    respondWith(401, { detail: '아이디 또는 비밀번호가 올바르지 않습니다.' })

    await expect(POST('auth/login', {})).rejects.toThrow('아이디 또는 비밀번호가 올바르지 않습니다.')

    expect(getLoginRequest()).toBeNull()
  })
})
