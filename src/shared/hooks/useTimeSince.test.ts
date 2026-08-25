import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useTimeSince from './useTimeSince'

describe('useTimeSince', () => {
  let updatedAt: Date

  beforeEach(() => {
    vi.useFakeTimers()
    updatedAt = new Date()
  })
  afterEach(() => vi.useRealTimers())

  it('renders nothing without a timestamp', () => {
    expect(renderHook(() => useTimeSince(null)).result.current).toBe('')
  })

  it('never reports zero seconds, however fresh the timestamp is', () => {
    const { result } = renderHook(() => useTimeSince(updatedAt))
    expect(result.current).toBe('1초 전')
  })

  it('counts up on its own without a new timestamp', () => {
    const { result } = renderHook(() => useTimeSince(updatedAt))

    act(() => { vi.advanceTimersByTime(3_000) })

    expect(result.current).toBe('3초 전')
  })

  it('switches to minutes past a minute', () => {
    const { result } = renderHook(() => useTimeSince(updatedAt))

    act(() => { vi.advanceTimersByTime(125_000) })

    expect(result.current).toBe('2분 전')
  })

  it('stops ticking once unmounted', () => {
    const { unmount } = renderHook(() => useTimeSince(updatedAt))

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
