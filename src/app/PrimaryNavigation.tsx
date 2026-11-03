import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  CalendarDays,
  ChevronRight,
  History,
  MessageSquareText,
  Swords,
  Trophy,
} from 'lucide-react'
import { firstRoomPath, isRoomTab as isRoomTabKey, pathOf } from '@/config/routes'

interface PrimaryNavigationProps {
  activeTab: string
  groupKeys: string[]
  roomCount?: number
  openReservations?: number
  recentPosts?: number
  recentPostsCapped: boolean
}

export default function PrimaryNavigation({
  activeTab, groupKeys, roomCount, openReservations, recentPosts, recentPostsCapped,
}: PrimaryNavigationProps) {
  const navigate = useNavigate()
  const isRoomTab = isRoomTabKey(activeTab)
  const primaryTabs = useMemo(() => [
    { key: 'overview', label: '홈', icon: LayoutDashboard },
    // Keep each number and unit together in its spoken accessible name.
    { key: 'match', label: '매칭', icon: Swords, badge: roomCount, spoken: (n: number) => ` 방 ${n}개` },
    { key: 'reservation', label: '예약', icon: CalendarDays, badge: openReservations, spoken: (n: number) => ` 모집중 ${n}건` },
    {
      key: 'community', label: '커뮤니티', icon: MessageSquareText,
      badge: recentPosts,
      display: recentPostsCapped ? `${recentPosts}+` : undefined,
      spoken: (n: number) => recentPostsCapped ? ` 새 글 ${n}개 이상` : ` 새 글 ${n}개`,
    },
    { key: 'leaderboard', label: '리더보드', icon: Trophy },
    { key: 'stats', label: '통계', icon: BarChart3 },
    { key: 'records', label: '전적', icon: History },
  ], [roomCount, openReservations, recentPosts, recentPostsCapped])
  const activePrimary = isRoomTab ? 'match' : activeTab
  // Admin has no menu tab; keep the strip reachable through its first tab.
  const hasPrimaryTab = primaryTabs.some((tab) => tab.key === activePrimary)
  const focusableTab = hasPrimaryTab ? activePrimary : primaryTabs[0].key

  return (
    <div className="sidebar-nav-card">
      <div className="sidebar-heading">
        <span>Navigation</span>
        <ChevronRight size={14} aria-hidden="true" />
      </div>
      <nav className="app-nav" role="tablist" aria-label="Main navigation">
        {primaryTabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              role="tab"
              id={`primary-tab-${t.key}`}
              aria-selected={activePrimary === t.key}
              aria-controls={t.key === 'match' ? `tabpanel-${isRoomTab ? activeTab : groupKeys[0] ?? 'leaderboard'}` : `tabpanel-${t.key}`}
              tabIndex={focusableTab === t.key ? 0 : -1}
              onClick={() => navigate(t.key === 'match' ? firstRoomPath(groupKeys) : pathOf(t.key))}
              onKeyDown={(e) => {
                const idx = primaryTabs.findIndex(x => x.key === t.key)
                let next = -1
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % primaryTabs.length
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + primaryTabs.length) % primaryTabs.length
                if (next >= 0) {
                  e.preventDefault()
                  const nextKey = primaryTabs[next].key
                  navigate(nextKey === 'match' ? firstRoomPath(groupKeys) : pathOf(nextKey))
                  document.getElementById(`primary-tab-${nextKey}`)?.focus()
                }
              }}
              className={`tab-btn${activePrimary === t.key ? ' active' : ''}`}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{t.label}</span>
              {t.badge != null && (
                <span className="nav-badge">
                  <span aria-hidden="true">{t.display ?? t.badge}</span>
                  <span className="sr-only">{t.spoken(t.badge)}</span>
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
