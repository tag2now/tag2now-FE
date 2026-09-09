import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useCountUp from './useCountUp'

/** jsdom ships no matchMedia, which the hook reads as "do not animate". These
 * tests install one so both branches are reachable; the no-matchMedia case is
 * every other suite in this repo, which is why none of them had to change. */
function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: reduced }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useCountUp', () => {
  it('settles on the target without animating when motion is not asked for', () => {
    const { result } = renderHook(() => useCountUp(512))

    expect(result.current).toBe(512)
  })

  it('settles on the target when the reader prefers reduced motion', () => {
    stubMatchMedia(true)

    const { result } = renderHook(() => useCountUp(512))

    expect(result.current).toBe(512)
  })

  // The em dash the KPIs show while rooms are in flight. Counting it down to
  // zero would assert an empty server rather than an unfinished request.
  it('passes a missing figure through rather than counting to zero', () => {
    const { result } = renderHook(() => useCountUp(null))

    expect(result.current).toBeNull()
  })

  it('holds nothing countable across a rerender', () => {
    const { result, rerender } = renderHook(({ n }) => useCountUp(n), {
      initialProps: { n: 7 as number | null },
    })
    expect(result.current).toBe(7)

    rerender({ n: null })

    expect(result.current).toBeNull()
  })

  it('counts up to a new figure and lands exactly on it', async () => {
    stubMatchMedia(false)
    const { result, rerender } = renderHook(({ n }) => useCountUp(n), {
      initialProps: { n: 10 },
    })

    rerender({ n: 40 })
    // The frames run on a real clock; the hook settles in 600ms.
    await act(() => new Promise((resolve) => setTimeout(resolve, 800)))

    expect(result.current).toBe(40)
  })

  it('does not replay when a poll returns the figure already shown', () => {
    stubMatchMedia(false)
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    const { rerender } = renderHook(({ n }) => useCountUp(n), { initialProps: { n: 10 } })
    raf.mockClear()

    rerender({ n: 10 })

    expect(raf).not.toHaveBeenCalled()
  })
})
