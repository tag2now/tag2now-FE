import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'
import LeaderboardViews from "@/shared/LeaderboardViews";
import Stats from "@/stat/Stats"
import Header from "@/shared/components/Header";
import LiveBadge from "@/shared/components/LiveBadge";
import PlayerProfileCard from '@/shared/components/PlayerProfileCard'
import Footer from "@/shared/components/Footer";
import PatchNotes from "@/shared/components/PatchNotes";
import { LoginDialog } from "@/auth/component";
import Chat from "@/chat/Chat";
import InstallSheet from "@/install/InstallSheet";
import { GROUP_ORDER } from '@/config/tabConfig'
import { isRoomTab as isRoomTabKey } from '@/config/routes'
import useActiveTab from '@/shared/hooks/useActiveTab'
import useAppUpdate from '@/shared/hooks/useAppUpdate'
import useLeaderboard from "@/shared/hooks/useLeaderboard";
import useCurrentRankLeaderboard from "@/shared/hooks/useCurrentRankLeaderboard";
import { toLeaderboardData } from "@/shared/currentRankLeaderboard";
import useRooms from "@/match/useRooms";
import useReservations, { countOpen } from "@/reservation/useReservations";
import useCommunityFeed, { countRecent, isRecentCountCapped } from "@/community/useCommunityFeed";
import { POLL } from '@/config/polling'
import Community from "@/community/Community";
import Rooms from "@/match/Rooms";
import CurrentRankHoldersButton from "@/match/CurrentRankHoldersButton";
import Reservation from "@/reservation/Reservation";
import Overview from "@/overview/Overview";
import Admin from "@/admin/Admin";
import PrimaryNavigation from '@/app/PrimaryNavigation'
import RoomTabs from '@/app/RoomTabs'

export default function App() {
  const activeTab = useActiveTab()
  useAppUpdate()
  const lb = useLeaderboard()
  // The leaderboard tab opens on it and the home page summarises it. A save
  // knows only the RPCN id, so the names come from the score board.
  const currentRankRaw = useCurrentRankLeaderboard()
  const currentRankData = useMemo(
    () => currentRankRaw.data && toLeaderboardData(currentRankRaw.data, lb.data?.entries),
    [currentRankRaw.data, lb.data],
  )
  const currentRank = { ...currentRankRaw, data: currentRankData }
  const rooms = useRooms()
  // One reservation poll for the whole app, shared with the panel. The rate
  // follows the active tab: a user looking at a roster fill wants it fast, and
  // a user on any other tab only needs the badge to be honest. Both are the
  // same request — the panel used to run a second 10s poll of its own.
  const reservations = useReservations(
    activeTab === 'reservation' ? POLL.reservationsActive : POLL.reservationsBackground,
  )
  const communityFeed = useCommunityFeed(
    activeTab === 'community' ? POLL.communityActive : POLL.communityBackground,
  )

  const groups = rooms.data?.groups ?? {}
  // Everyone currently in a room, so the profile card can say whether you
  // are one of them.
  const roomUsers = useMemo(
    () => Object.values(groups).flatMap(group => group.flatMap(room => room.users ?? [])),
    [groups],
  )
  const roomsLoaded = rooms.data !== null
  // Room tabs are part of the fixed layout: they render before rooms load and
  // survive a failed fetch, so the tab strip never shifts under the user.
  const groupKeys = useMemo(() => {
    const extra = Object.keys(groups).filter((key) => !GROUP_ORDER.includes(key))
    return [...GROUP_ORDER, ...extra]
  }, [groups])

  const isRoomTab = isRoomTabKey(activeTab)
  const activeRoomsData = isRoomTab ? { rooms: groups[activeTab] ?? [] } : null

  // A badge is a live count, so it carries the same "unknown is not zero" rule
  // as the room tabs: undefined until the first load settles, and the badge is
  // simply not rendered until then. Zero is a real answer and stays visible -
  // "매칭 0" tells the user the lobby is empty, which is worth knowing.
  const openReservations = reservations.data && countOpen(reservations.data)
  // Zero is dropped here, unlike the two counts above: a badge that never goes
  // away stops signalling that something arrived.
  const recentPosts = countRecent(communityFeed.data) || undefined
  const recentPostsCapped = isRecentCountCapped(communityFeed.data)
  // Admin has no navigation tab; its panel supplies its own accessible name.
  const panelLabel = activeTab === 'admin' ? undefined : isRoomTab ? `tab-${activeTab}` : `primary-tab-${activeTab}`

  // Both panels close over App-level polled data, so they are built here rather
  // than inline in the route table, which would make that table unreadable.
  const overviewPanel = (
    <Overview
      rooms={rooms.data}
      roomsLoading={rooms.loading}
      leaderboardEntries={lb.data?.entries}
      currentRankEntries={currentRank.data?.entries}
      currentRankTotal={currentRank.data?.total_records}
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
      actions={<CurrentRankHoldersButton roomUsers={roomUsers} leaderboardEntries={lb.data?.entries} currentRankEntries={currentRank.data?.entries} />}
    />
  )

  return (
    <div className="app-shell">
      <a className="skip-link" href="#mainContent">본문으로 건너뛰기</a>
      <PatchNotes />
      {/* Any feature opens it through requestLogin; one instance serves all. */}
      <LoginDialog />
      <Header />
      <div className="app-layout">
        <aside className="app-sidebar" aria-label="서비스 메뉴">
          {/* Live above the nav, with the badges it belongs beside — not in the
              header, where it was a lone figure between the wordmark and the
              profile, belonging to neither. */}
          <LiveBadge totalUsers={rooms.data?.totalUsers} />
          {/* One PlayerProfileCard renders both surfaces — this card and, through
              a portal, the header slot that replaces it on a phone — so the
              signed-in account is shown from one piece of state, not two. */}
          <PrimaryNavigation
            activeTab={activeTab}
            groupKeys={groupKeys}
            roomCount={roomsLoaded ? rooms.data?.total ?? 0 : undefined}
            openReservations={openReservations ?? undefined}
            recentPosts={recentPosts}
            recentPostsCapped={recentPostsCapped}
          />
          <PlayerProfileCard leaderboardEntries={lb.data?.entries} roomUsers={roomUsers} />
        </aside>

        <main id="mainContent" className="app-main">
          {isRoomTab && groupKeys.length > 0 && (
            <RoomTabs activeTab={activeTab} groupKeys={groupKeys} groups={groups} loaded={roomsLoaded} />
          )}
          <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={panelLabel} aria-label={panelLabel ? undefined : '계정 관리'} tabIndex={0}>
            <Routes>
              {/* The overview owns "/" so a bare link opens the landing panel,
                  and the catch-all sends an unknown path to that same screen —
                  nginx serves index.html for every path, so a typo arrives here
                  rather than at a 404 page. */}
              <Route path="/" element={overviewPanel} />
              <Route path="/match/:group" element={roomsPanel} />
              <Route path="/leaderboard/:view?" element={<LeaderboardViews current={currentRankRaw} best={lb} />} />
              <Route path="/reservation" element={<Reservation leaderboardEntries={lb.data?.entries} />} />
              <Route path="/reservation/:id" element={<Reservation leaderboardEntries={lb.data?.entries} />} />
              <Route path="/community" element={<Community leaderboardEntries={lb.data?.entries} />} />
              <Route path="/community/:postId" element={<Community leaderboardEntries={lb.data?.entries} />} />
              <Route path="/stats" element={<Stats leaderboardEntries={lb.data?.entries} />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={overviewPanel} />
            </Routes>
          </div>
        </main>
        {/* The third column on a wide screen; narrower, a launcher fixed to
            the viewport. Here rather than per tab, so the stream lasts the
            whole visit. */}
        <Chat leaderboardEntries={lb.data?.entries} />
      </div>
      <Footer />
      <InstallSheet />
    </div>
  )
}
