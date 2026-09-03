import { useMemo } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Leaderboard from "@/shared/Leaderboard";
import Stats from "@/stat/Stats"
import Header from "@/shared/components/Header";
import Footer from "@/shared/components/Footer";
import PatchNotes from "@/shared/components/PatchNotes";
import { GROUP_ORDER, formatGroupName } from '@/config/tabConfig'
import { firstRoomPath, isRoomTab as isRoomTabKey, pathOf } from '@/config/routes'
import useActiveTab from '@/shared/hooks/useActiveTab'
import useLeaderboard from "@/shared/hooks/useLeaderboard";
import useRooms from "@/match/useRooms";
import useReservations, { countOpen } from "@/reservation/useReservations";
import Community from "@/community/Community";
import Rooms from "@/match/Rooms";
import type { Room } from "@/match/types";
import Reservation from "@/reservation/Reservation";
import Overview from "@/overview/Overview";
import {
  BarChart3,
  LayoutDashboard,
  CalendarDays,
  ChevronRight,
  MessageSquareText,
  Radio,
  Swords,
  Trophy,
} from 'lucide-react'

// Before the first successful load the count is unknown, not zero - "(0)" would
// assert there are no rooms while the fetch is still in flight or has failed.
// Once rooms have loaded, a group the payload omits really is empty.
function roomCountLabel(rooms: Room[] | undefined, loaded: boolean): string {
  if (!loaded) return '—'
  return String(rooms?.length ?? 0)
}

export default function App() {
  const navigate = useNavigate()
  const activeTab = useActiveTab()
  const lb = useLeaderboard()
  const rooms = useRooms()
  const reservations = useReservations()

  const groups = rooms.data?.groups ?? {}
  const roomsLoaded = rooms.data !== null
  // Room tabs are part of the fixed layout: they render before rooms load and
  // survive a failed fetch, so the tab strip never shifts under the user.
  const groupKeys = useMemo(() => {
    const extra = Object.keys(groups).filter((key) => !GROUP_ORDER.includes(key))
    return [...GROUP_ORDER, ...extra]
  }, [groups])

  const tabs = useMemo(
    () => [
      { key: 'overview', label: '개요' },
      ...groupKeys.map((key) => ({ key, label: `${formatGroupName(key)} (${roomCountLabel(groups[key], roomsLoaded)})` })),
      { key: 'reservation', label: '예약' },
      { key: 'leaderboard', label: '리더보드' },
      { key: 'community', label: '커뮤니티' },
      { key: 'stats', label: '통계' },
    ],
    [groupKeys, groups, roomsLoaded],
  )

  const isRoomTab = isRoomTabKey(activeTab)
  const activeRoomsData = isRoomTab ? { rooms: groups[activeTab] ?? [] } : null

  // A badge is a live count, so it carries the same "unknown is not zero" rule
  // as the room tabs: undefined until the first load settles, and the badge is
  // simply not rendered until then. Zero is a real answer and stays visible -
  // "매칭 0" tells the user the lobby is empty, which is worth knowing.
  const openReservations = reservations.data && countOpen(reservations.data)
  const primaryTabs = useMemo(() => [
    { key: 'overview', label: '개요' },
    // `spoken` is the whole badge as assistive tech reads it, in one element:
    // an accessible name is joined across element boundaries with a space, so
    // splitting the number from its unit would say "방 3 개".
    { key: 'match', label: '매칭', badge: roomsLoaded ? rooms.data?.total ?? 0 : undefined, spoken: (n: number) => ` 방 ${n}개` },
    { key: 'reservation', label: '예약', badge: openReservations ?? undefined, spoken: (n: number) => ` 모집중 ${n}건` },
    { key: 'leaderboard', label: '리더보드' },
    { key: 'community', label: '커뮤니티' },
    { key: 'stats', label: '통계' },
  ], [roomsLoaded, rooms.data?.total, openReservations])
  const activePrimary = isRoomTab ? 'match' : activeTab

  const tabIcon = (key: string) => {
    if (key === 'overview') return LayoutDashboard
    if (key === 'match') return Swords
    if (key === 'reservation') return CalendarDays
    if (key === 'leaderboard') return Trophy
    if (key === 'community') return MessageSquareText
    if (key === 'stats') return BarChart3
    return Swords
  }

  const activeLabel = tabs.find((item) => item.key === activeTab)?.label ?? '대시보드'

  // Both panels close over App-level polled data, so they are built here rather
  // than inline in the route table, which would make that table unreadable.
  const overviewPanel = (
    <Overview
      rooms={rooms.data}
      roomsLoading={rooms.loading}
      leaderboardEntries={lb.data?.entries}
      leaderboardTotal={lb.data?.total_records}
    />
  )

  const roomsPanel = (
    <Rooms
      data={activeRoomsData}
      loading={rooms.loading}
      refreshing={rooms.refreshing}
      error={rooms.error}
      onRefresh={rooms.refresh}
      groupKey={activeTab}
      lastUpdated={rooms.lastUpdated}
      leaderboardEntries={lb.data?.entries}
    />
  )

  return (
    <div className="app-shell">
      <a className="skip-link" href="#mainContent">본문으로 건너뛰기</a>
      <PatchNotes />
      <Header totalUsers={rooms.data?.totalUsers} leaderboardEntries={lb.data?.entries} />
      <div className="app-layout">
        <aside className="app-sidebar" aria-label="서비스 메뉴">
          <div className="sidebar-heading">
            <span>Navigation</span>
            <ChevronRight size={14} aria-hidden="true" />
          </div>
          <nav className="app-nav" role="tablist" aria-label="Main navigation">
            {primaryTabs.map((t) => (
              (() => {
                const Icon = tabIcon(t.key)
                return (
                  <button
                    key={t.key}
                    role="tab"
                    id={`primary-tab-${t.key}`}
                    aria-selected={activePrimary === t.key}
                    aria-controls={t.key === 'match' ? `tabpanel-${isRoomTab ? activeTab : groupKeys[0] ?? 'leaderboard'}` : `tabpanel-${t.key}`}
                    tabIndex={activePrimary === t.key ? 0 : -1}
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
                        <span aria-hidden="true">{t.badge}</span>
                        <span className="sr-only">{t.spoken(t.badge)}</span>
                      </span>
                    )}
                  </button>
                )
              })()
            ))}
          </nav>
          <div className="sidebar-status">
            <Radio size={15} aria-hidden="true" />
            <div><strong>Live service</strong><span>실시간 데이터 연결됨</span></div>
          </div>
        </aside>

        <main id="mainContent" className="app-main">
          <div className="content-heading">
            <div>
              <span className="content-eyebrow">TAG2NOW / LIVE DATA</span>
              <h2>{activeLabel}</h2>
            </div>
            <span className="content-status"><span /> 실시간</span>
          </div>
          {isRoomTab && groupKeys.length > 0 && (
            <nav className="room-tabs" role="tablist" aria-label="매칭 종류 선택">
              <span className="room-tabs-label">매칭 종류</span>
              <div>
                {groupKeys.map((key) => (
                  <button
                    key={key}
                    role="tab"
                    aria-label={`${formatGroupName(key)} (${roomCountLabel(groups[key], roomsLoaded)})`}
                    id={`tab-${key}`}
                    aria-selected={activeTab === key}
                    aria-controls={`tabpanel-${key}`}
                    tabIndex={activeTab === key ? 0 : -1}
                    onClick={() => navigate(pathOf(key))}
                    className={activeTab === key ? 'active' : ''}
                  >
                    <Swords size={14} aria-hidden="true" />
                    {formatGroupName(key)}
                    <span>{roomCountLabel(groups[key], roomsLoaded)}</span>
                  </button>
                ))}
              </div>
            </nav>
          )}
          <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={isRoomTab ? `tab-${activeTab}` : `primary-tab-${activeTab}`} tabIndex={0}>
            <Routes>
              {/* The overview owns "/" so a bare link opens the landing panel,
                  and the catch-all sends an unknown path to that same screen —
                  nginx serves index.html for every path, so a typo arrives here
                  rather than at a 404 page. */}
              <Route path="/" element={overviewPanel} />
              <Route path="/match/:group" element={roomsPanel} />
              <Route path="/leaderboard" element={<Leaderboard data={lb.data} loading={lb.loading} refreshing={lb.refreshing} error={lb.error} onRefresh={lb.refresh} />} />
              <Route path="/reservation" element={<Reservation />} />
              <Route path="/reservation/:id" element={<Reservation />} />
              <Route path="/community" element={<Community leaderboardEntries={lb.data?.entries} />} />
              <Route path="/community/:postId" element={<Community leaderboardEntries={lb.data?.entries} />} />
              <Route path="/stats" element={<Stats leaderboardEntries={lb.data?.entries} />} />
              <Route path="*" element={overviewPanel} />
            </Routes>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
