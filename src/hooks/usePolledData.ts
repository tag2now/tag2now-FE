import { useState, useCallback, useEffect } from 'react'
import type { PolledState } from '@/types'

export default function usePolledData<T>(fetcher: () => Promise<T>, interval: number | null): PolledState<T> {
  const load = useCallback(async () => {
    setState((s) => s.data
        ? { ...s, refreshing: true, error: null }
        : { ...s, loading: true, error: null }
    )

    try {
      const data = await fetcher();

      setState((s) => {
        if (s.data === data) return s.refreshing ? { ...s, refreshing: false } : s
        return { data, loading: false, refreshing: false, error: null }
      });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, refreshing: false, error: e.message }))
    }
  }, [fetcher])

  const [state, setState] = useState<Omit<PolledState<T>, 'refresh'>>({ data: null, loading: true, refreshing: false, error: null })

  useEffect(() => {
    load()
    if (!interval) return
    const timer = setInterval(load, interval)
    return () => clearInterval(timer)
  }, [load, interval])

  return { ...state, refresh: load }
}
