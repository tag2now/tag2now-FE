import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useMediaQuery from './useMediaQuery'

/** A matchMedia whose answer the test can change, notifying as a browser does. */
function installMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return matches },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  return {
    resize(next: boolean) {
      matches = next
      listeners.forEach((notify) => notify())
    },
    listening: () => listeners.size,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('useMediaQuery', () => {
  it('follows the viewport as it crosses the query', () => {
    const viewport = installMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1200px)'))
    expect(result.current).toBe(false)

    act(() => viewport.resize(true))

    expect(result.current).toBe(true)
  })

  it('stops listening once unmounted', () => {
    const viewport = installMatchMedia(true)
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1200px)'))

    unmount()

    expect(viewport.listening()).toBe(0)
  })

  it('answers no where there is no matchMedia, as in jsdom', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1200px)'))

    expect(result.current).toBe(false)
  })
})
