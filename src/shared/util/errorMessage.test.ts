import { describe, expect, it } from 'vitest'
import { errorMessage } from '@/shared/util/errorMessage'

describe('errorMessage', () => {
  it.each([new Error('서버 오류'), { message: '서버 오류' }])('preserves a string message: %j', (error) => {
    expect(errorMessage(error)).toBe('서버 오류')
  })

  it('preserves an explicitly empty message', () => {
    expect(errorMessage({ message: '' })).toBe('')
  })

  it.each([
    { error: '연결 실패', expected: '연결 실패' },
    { error: null, expected: 'null' },
    { error: undefined, expected: 'undefined' },
    { error: 503, expected: '503' },
    { error: { message: 503 }, expected: '[object Object]' },
  ])('returns a string for other rejected values: $expected', ({ error, expected }) => {
    expect(errorMessage(error)).toBe(expected)
  })
})
