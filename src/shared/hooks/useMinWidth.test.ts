import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useMinWidth from './useMinWidth'

/** jsdom has no ResizeObserver; this one reports whatever width a test hands
 * it, to every element being observed. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  observed: Element[] = []
  disconnected = false
  constructor(private callback: ResizeObserverCallback) { FakeResizeObserver.instances.push(this) }
  observe(element: Element) { this.observed.push(element) }
  unobserve() {}
  disconnect() { this.disconnected = true }
  resize(width: number) {
    const entries = this.observed.map((target) => ({ target, contentRect: { width } }) as ResizeObserverEntry)
    this.callback(entries, this as unknown as ResizeObserver)
  }
}

const resizeTo = (width: number) => act(() => { FakeResizeObserver.instances.at(-1)!.resize(width) })

describe('useMinWidth', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('starts narrow, before anything has been measured', () => {
    const { result } = renderHook(() => useMinWidth<HTMLDivElement>(600))
    expect(result.current[1]).toBe(false)
  })

  it('turns wide at the threshold and back below it', () => {
    const { result } = renderHook(() => useMinWidth<HTMLDivElement>(600))
    act(() => result.current[0](document.createElement('div')))

    resizeTo(600)
    expect(result.current[1]).toBe(true)

    resizeTo(599)
    expect(result.current[1]).toBe(false)
  })

  it('observes an element that attaches after the first render', () => {
    const { result } = renderHook(() => useMinWidth<HTMLDivElement>(600))
    expect(FakeResizeObserver.instances).toHaveLength(0)

    act(() => result.current[0](document.createElement('div')))

    expect(FakeResizeObserver.instances).toHaveLength(1)
  })

  it('stops observing when the element goes away', () => {
    const { result } = renderHook(() => useMinWidth<HTMLDivElement>(600))
    act(() => result.current[0](document.createElement('div')))
    const observer = FakeResizeObserver.instances[0]

    act(() => result.current[0](null))

    expect(observer.disconnected).toBe(true)
  })

  it('stays narrow where there is no ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const { result } = renderHook(() => useMinWidth<HTMLDivElement>(600))
    act(() => result.current[0](document.createElement('div')))
    expect(result.current[1]).toBe(false)
  })
})
