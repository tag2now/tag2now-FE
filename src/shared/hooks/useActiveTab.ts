import { useLocation } from 'react-router-dom'
import { FIXED_TABS, type FixedTab } from '@/config/routes'

/** Which tab the current URL selects.
 *
 * The tab strip is driven by the path rather than by state, so a deep link, a
 * back button and a nav click all arrive at the same place. An unknown path
 * falls back to the overview, which is what the tab state did before routes
 * existed and what the catch-all route renders.
 */
export default function useActiveTab(): string {
  const { pathname } = useLocation()

  const roomGroup = pathname.match(/^\/match\/([^/]+)/)
  if (roomGroup) return decodeURIComponent(roomGroup[1])

  const segment = pathname.split('/')[1] ?? ''
  if (!segment) return 'overview'

  return FIXED_TABS.includes(segment as FixedTab) ? segment : 'overview'
}
