import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import useIdempotencyKey from './useIdempotencyKey'

describe('useIdempotencyKey', () => {
  it('keeps one key while the content is the same, so a retry replays', () => {
    const { result } = renderHook(() => useIdempotencyKey())

    expect(result.current.keyFor({ body: '안녕' })).toBe(result.current.keyFor({ body: '안녕' }))
  })

  it('takes a new key when the content changes, since a key cannot carry two requests', () => {
    const { result } = renderHook(() => useIdempotencyKey())

    expect(result.current.keyFor({ body: '안녕' })).not.toBe(result.current.keyFor({ body: '안녕하세요' }))
  })

  it('takes a new key after a success, so the same text can be sent again on purpose', () => {
    const { result } = renderHook(() => useIdempotencyKey())
    const first = result.current.keyFor({ body: 'ㅋㅋ' })

    result.current.reset()

    expect(result.current.keyFor({ body: 'ㅋㅋ' })).not.toBe(first)
  })
})
