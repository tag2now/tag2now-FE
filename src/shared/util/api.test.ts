import { afterEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET } from './api'

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
