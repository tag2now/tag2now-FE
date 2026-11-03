import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/shared/util/errorMessage'
import type { MatchRecord, MatchRecordPage } from '@/shared/matchRecords'

export interface RecordPages<P> {
  /** The first page as answered, for whatever it carries beside the matches. */
  first: P | null
  matches: MatchRecord[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadingMore: boolean
  moreFailed: boolean
  loadMore: () => void
  refresh: () => void
}

/** A newest-first record list paged by `before`, so matches recorded while the
 * reader scrolls do not shift the next page. A new `fetchPage` starts over;
 * pass a stable one (useCallback) for the same query. */
export default function useRecordPages<P extends MatchRecordPage>(
  fetchPage: (before: number | null) => Promise<P>,
): RecordPages<P> {
  const [first, setFirst] = useState<P | null>(null)
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [nextBefore, setNextBefore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  const [reloads, setReloads] = useState(0)
  // A page that answers after the query changed belongs to the old list.
  const generation = useRef(0)

  useEffect(() => {
    const current = ++generation.current
    setLoading(true)
    setError(null)
    setLoadingMore(false)
    setMoreFailed(false)
    fetchPage(null)
      .then((page) => {
        if (current !== generation.current) return
        setFirst(page)
        setMatches(page.matches)
        setNextBefore(page.next_before)
      })
      .catch((e: unknown) => { if (current === generation.current) setError(errorMessage(e)) })
      .finally(() => { if (current === generation.current) setLoading(false) })
  }, [fetchPage, reloads])

  const loadMore = useCallback(() => {
    if (nextBefore == null || loadingMore) return
    const current = generation.current
    setLoadingMore(true)
    setMoreFailed(false)
    fetchPage(nextBefore)
      .then((page) => {
        if (current !== generation.current) return
        setMatches((shown) => [...shown, ...page.matches])
        setNextBefore(page.next_before)
      })
      .catch(() => { if (current === generation.current) setMoreFailed(true) })
      .finally(() => { if (current === generation.current) setLoadingMore(false) })
  }, [fetchPage, nextBefore, loadingMore])

  const refresh = useCallback(() => setReloads((n) => n + 1), [])

  return { first, matches, loading, error, hasMore: nextBefore != null, loadingMore, moreFailed, loadMore, refresh }
}
