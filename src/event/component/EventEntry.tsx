import { Link, NavLink } from 'react-router-dom'
import { ChevronRight, Gift } from 'lucide-react'
import { pathOf } from '@/config/routes'
import useActiveTab from '@/shared/hooks/useActiveTab'

/** The event ends in days, so it stands beside the nav rather than in it, and
 * removing it later leaves the tabs as they were. */
export function EventSidebarCard() {
  return (
    <NavLink to={pathOf('event')} className="event-sidebar-card" aria-label="데스활성화 이벤트">
      <Gift size={16} aria-hidden="true" />
      <span>이벤트</span>
      <ChevronRight size={14} aria-hidden="true" />
    </NavLink>
  )
}

/** A phone's sidebar is its tab bar, so the same way in floats above it. */
export function EventFloatingLink() {
  if (useActiveTab() === 'event') return null
  return (
    <Link to={pathOf('event')} className="event-floating-link" aria-label="데스활성화 이벤트">
      <Gift size={18} aria-hidden="true" />
    </Link>
  )
}
