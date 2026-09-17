import { render, screen, waitFor, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import createPolledSource, { type PolledSourceState } from './createPolledSource'

/** The duplication this module exists to remove was invisible to every other
 * test: two components each polling the same endpoint is not a render anyone
 * asserts on, so it survived long enough to be documented as intended. These
 * count the calls instead. */

afterEach(() => {
  vi.useRealTimers()
})

function mount(usePolled: (interval: number | null) => PolledSourceState<string[]>, intervals: (number | null)[]) {
  function Reader({ interval, label }: { interval: number | null, label: string }) {
    const state = usePolled(interval)
    return <span data-testid={label}>{JSON.stringify(state.data)}</span>
  }
  return render(
    <>{intervals.map((interval, index) => (
      <Reader key={index} interval={interval} label={`reader-${index}`} />
    ))}</>,
  )
}

describe('createPolledSource', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('fetches once for several subscribers mounted together', async () => {
    const fetcher = vi.fn(async (): Promise<string[]> => ['a'])
    const usePolled = createPolledSource(fetcher)

    mount(usePolled, [60_000, 10_000])

    await waitFor(() => expect(screen.getByTestId('reader-1')).toHaveTextContent('a'))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('gives every subscriber the same snapshot', async () => {
    const fetcher = vi.fn(async (): Promise<string[]> => ['shared'])
    const usePolled = createPolledSource(fetcher)

    mount(usePolled, [60_000, 10_000])

    await waitFor(() => expect(screen.getByTestId('reader-0')).toHaveTextContent('shared'))
    expect(screen.getByTestId('reader-1')).toHaveTextContent('shared')
  })

  it('polls at the fastest rate any subscriber asks for, not once per subscriber', async () => {
    const fetcher = vi.fn(async (): Promise<string[]> => ['a'])
    const usePolled = createPolledSource(fetcher)

    mount(usePolled, [60_000, 10_000])
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    // 30s: three ticks of the 10s rate and none of the 60s one. Two independent
    // hooks would have produced three here *and* kept a second timer armed.
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('falls back to the slower rate when the fast subscriber leaves', async () => {
    const fetcher = vi.fn(async (): Promise<string[]> => ['a'])
    const usePolled = createPolledSource(fetcher)

    function Pair({ fast }: { fast: boolean }) {
      usePolled(60_000)
      return fast ? <Fast /> : null
    }
    function Fast() {
      usePolled(10_000)
      return null
    }

    const view = render(<Pair fast />)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    view.rerender(<Pair fast={false} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    // The 10s timer is gone with its subscriber; 30s is not yet a 60s tick.
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('starts a fresh request for an explicit refresh rather than joining one in flight', async () => {
    let release: (value: string[]) => void = () => {}
    const fetcher = vi.fn<() => Promise<string[]>>()
      .mockImplementationOnce(() => new Promise<string[]>((resolve) => { release = resolve }))
      .mockResolvedValue(['after-write'])
    const usePolled = createPolledSource(fetcher)

    let refresh: () => Promise<void> = async () => {}
    function Reader() {
      const state = usePolled(null)
      refresh = state.refresh
      return <span data-testid="value">{JSON.stringify(state.data)}</span>
    }
    render(<Reader />)

    // A write lands while the first load is still open. Joining that request
    // would answer with the state from before the write.
    const refreshed = act(async () => { await refresh() })
    release(['before-write'])
    await refreshed

    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('after-write'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('forgets its data once the last subscriber unmounts', async () => {
    const fetcher = vi.fn(async (): Promise<string[]> => ['a'])
    const usePolled = createPolledSource(fetcher)

    const first = mount(usePolled, [10_000])
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    first.unmount()

    // A remount is a fresh page as far as the store is concerned, so it loads
    // again rather than serving a snapshot nobody has kept warm.
    mount(usePolled, [10_000])
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('stops polling when every subscriber is gone', async () => {
    const fetcher = vi.fn(async (): Promise<string[]> => ['a'])
    const usePolled = createPolledSource(fetcher)

    const view = mount(usePolled, [10_000])
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    view.unmount()

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('reports a failure to every subscriber and keeps polling', async () => {
    const fetcher = vi.fn<() => Promise<string[]>>()
      .mockRejectedValueOnce(new Error('서버가 응답하지 않습니다.'))
      .mockResolvedValue(['recovered'])
    const usePolled = createPolledSource(fetcher)

    function Reader() {
      const state = usePolled(10_000)
      return <span data-testid="value">{state.error ?? JSON.stringify(state.data)}</span>
    }
    render(<><Reader /><Reader /></>)

    await waitFor(() => {
      expect(screen.getAllByTestId('value')[0]).toHaveTextContent('서버가 응답하지 않습니다.')
      expect(screen.getAllByTestId('value')[1]).toHaveTextContent('서버가 응답하지 않습니다.')
    })

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    await waitFor(() => expect(screen.getAllByTestId('value')[0]).toHaveTextContent('recovered'))
  })
})
