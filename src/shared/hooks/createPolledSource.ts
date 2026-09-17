import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { PolledState } from '@/shared/hooks/usePolledData'

/** Same shape as PolledState, but `refresh` is awaitable: a caller that has just
 * written something needs to know when the reread it triggered has landed. */
export type PolledSourceState<T> = Omit<PolledState<T>, 'refresh'> & { refresh: () => Promise<void> }

/** A polled source that several components can read without each one fetching.
 *
 * `usePolledData` gives every caller its own timer, which is right when a
 * source has one consumer. Reservations have two — the sidebar badge, which
 * wants a slow honest number on every tab, and the reservation panel, which
 * wants a fast one while you watch a roster fill — and two independent hooks
 * meant the same endpoint was polled twice whenever that tab was open, from
 * two states that could disagree about what the server had said.
 *
 * Here one timer and one in-flight request serve every subscriber, and the
 * interval is **the fastest any subscriber asks for**: opening the panel speeds
 * the existing poll up rather than starting a second one, and closing it lets
 * the rate fall back on its own.
 *
 * State resets once the last subscriber leaves, so nothing survives into a
 * context that never asked for it — which also gives each test a clean store
 * without a test-only entry point.
 */
export default function createPolledSource<T>(fetcher: () => Promise<T>) {
  type Snapshot = Omit<PolledState<T>, 'refresh'>

  const initial: Snapshot = { data: null, loading: true, refreshing: false, error: null, lastUpdated: null }

  let snapshot: Snapshot = initial
  const subscribers = new Set<() => void>()
  /** Requested interval per subscriber; the timer runs at the smallest. */
  const intervals = new Map<symbol, number | null>()
  let timer: ReturnType<typeof setInterval> | null = null
  let running: Promise<void> | null = null

  const emit = () => subscribers.forEach((notify) => notify())

  const set = (next: Snapshot) => {
    snapshot = next
    emit()
  }

  const fetchNow = (): Promise<void> => {
    set(snapshot.data
      ? { ...snapshot, refreshing: true, error: null }
      : { ...snapshot, loading: true, error: null })

    const attempt: Promise<void> = fetcher().then(
      (data) => {
        const lastUpdated = new Date()
        set(snapshot.data === data
          ? { ...snapshot, refreshing: false, lastUpdated }
          : { data, loading: false, refreshing: false, error: null, lastUpdated })
      },
      (error: any) => {
        set({ ...snapshot, loading: false, refreshing: false, error: error?.message ?? String(error) })
      },
    ).finally(() => { if (running === attempt) running = null })

    running = attempt
    return attempt
  }

  /** A background tick joins whatever is already in flight — two timers firing
   * close together should cost one request, which is the point of this module. */
  const load = (): Promise<void> => running ?? fetchNow()

  /** An explicit refresh never joins one. Its caller has just written something
   * and needs a response that reflects the write; handing it a request that was
   * already in flight when the write landed returns the state from *before* it,
   * and the panel then shows a reservation it has just created as missing. */
  const refresh = (): Promise<void> => (running ? running.then(fetchNow) : fetchNow())

  /** The fastest rate anyone currently wants, or none if nobody wants a timer. */
  const desiredInterval = (): number | null => {
    const wanted = [...intervals.values()].filter((value): value is number => value != null)
    return wanted.length > 0 ? Math.min(...wanted) : null
  }

  let armed: number | null = null
  const retime = () => {
    const next = desiredInterval()
    if (next === armed) return
    armed = next
    if (timer) clearInterval(timer)
    timer = next == null ? null : setInterval(() => { load() }, next)
  }

  const subscribe = (token: symbol, interval: number | null, notify: () => void) => {
    subscribers.add(notify)
    intervals.set(token, interval)
    retime()
    return () => {
      subscribers.delete(notify)
      intervals.delete(token)
      if (subscribers.size === 0) {
        if (timer) clearInterval(timer)
        timer = null
        armed = null
        running = null
        snapshot = initial
      } else {
        retime()
      }
    }
  }

  return function usePolledSource(interval: number | null): PolledSourceState<T> {
    const token = useToken()

    const state = useSyncExternalStore(
      useCallback((notify: () => void) => subscribe(token, interval, notify), [token, interval]),
      () => snapshot,
      () => snapshot,
    )

    useEffect(() => {
      // The first subscriber triggers the initial load; later ones read the
      // snapshot that is already there rather than refetching it.
      if (snapshot.data === null && snapshot.error === null) load()
    }, [])

    return { ...state, refresh }
  }
}

/** A stable per-component identity, so one component's interval can be revised
 * (the reservation tab opening) without being mistaken for a second subscriber. */
function useToken(): symbol {
  const ref = useRef<symbol | null>(null)
  if (ref.current === null) ref.current = Symbol('polled-source-subscriber')
  return ref.current
}
