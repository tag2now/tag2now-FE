import { useState, useCallback, useEffect } from 'react'

export default function usePolledData(fetcher, interval) {
  const [state, setState] = useState({ data: null, loading: true, refreshing: false, error: null })

  const load = useCallback(() => {
    setState((s) => s.data
      ? { ...s, refreshing: true, error: null }
      : { ...s, loading: true, error: null }
    )
    fetcher()
      .then((data) => setState((s) => {
        if (s.data === data) return s.refreshing ? { ...s, refreshing: false } : s
        return { data, loading: false, refreshing: false, error: null }
      }))
      .catch((e) => setState((s) => ({ ...s, loading: false, refreshing: false, error: e.message })))
  }, [fetcher])

  useEffect(() => {
    load()
    if (!interval) return
    const timer = setInterval(load, interval)
    return () => clearInterval(timer)
  }, [load, interval])

  return { ...state, refresh: load }
}
