import { useCallback, useEffect, useState } from 'react'
import useRecordPages from '@/shared/hooks/useRecordPages'
import { fetchMatchRecords } from '@/shared/matchRecordsApi'

/** Typing pauses this long before the search is asked, so a name is one request, not one per letter. */
const SEARCH_DELAY_MS = 300

/** Everyone's matches, filtered by the name typed so far. `searched` is the
 * query the list answers, which trails the input while the reader types. */
export default function useMatchRecords(query: string) {
  const [searched, setSearched] = useState(query.trim())

  useEffect(() => {
    const timer = setTimeout(() => setSearched(query.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [query])

  const fetchPage = useCallback((before: number | null) => fetchMatchRecords({ q: searched }, before), [searched])
  return { searched, pages: useRecordPages(fetchPage) }
}
