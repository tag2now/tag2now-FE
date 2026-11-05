import { useMemo } from 'react'
import AppLayout from '@/app/AppLayout'
import AppRoutes from '@/app/AppRoutes'
import PrimaryNavigation from '@/app/PrimaryNavigation'
import RoomTabs from '@/app/RoomTabs'
import LiveBadge from '@/shared/components/LiveBadge'
import AccountProfile from '@/app/AccountProfile'
import Chat from '@/chat/Chat'
import { EventFloatingLink, EventSidebarCard } from '@/event/component'
import { GROUP_ORDER } from '@/config/tabConfig'
import { isRoomTab as isRoomTabKey } from '@/config/routes'
import { POLL } from '@/config/polling'
import useActiveTab from '@/shared/hooks/useActiveTab'
import useAppUpdate from '@/shared/hooks/useAppUpdate'
import useLeaderboard from '@/shared/hooks/useLeaderboard'
import useCurrentRankLeaderboard from '@/shared/hooks/useCurrentRankLeaderboard'
import { toLeaderboardData } from '@/shared/currentRankLeaderboard'
import useRooms from '@/match/useRooms'
import useReservations, { countOpen } from '@/reservation/useReservations'
import useCommunityFeed, { countRecent, isRecentCountCapped } from '@/community/useCommunityFeed'

export default function App() {
  const activeTab = useActiveTab()
  useAppUpdate()
  // The score board: the 최고 계급 view, and the online names a save lacks.
  const best = useLeaderboard()
  // Every place and rank shown outside 최고 계급 comes from this board.
  const currentRankRaw = useCurrentRankLeaderboard()
  const currentRankData = useMemo(
    () => currentRankRaw.data && toLeaderboardData(currentRankRaw.data, best.data?.entries),
    [currentRankRaw.data, best.data],
  )
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

  // A badge is a live count, so it carries the same "unknown is not zero" rule
  // as the room tabs: undefined until the first load settles, and the badge is
  // simply not rendered until then. Zero is a real answer and stays visible -
  // "매칭 0" tells the user the lobby is empty, which is worth knowing.
  const openReservations = reservations.data && countOpen(reservations.data)
  // Zero is dropped here, unlike the two counts above: a badge that never goes
  // away stops signalling that something arrived.
  const recentPosts = countRecent(communityFeed.data) || undefined
  const recentPostsCapped = isRecentCountCapped(communityFeed.data)

  return (
    <AppLayout
      sidebar={(
        <>
          <LiveBadge totalUsers={rooms.data?.totalUsers} />
          <PrimaryNavigation
            activeTab={activeTab}
            groupKeys={groupKeys}
            roomCount={roomsLoaded ? rooms.data?.total ?? 0 : undefined}
            openReservations={openReservations ?? undefined}
            recentPosts={recentPosts}
            recentPostsCapped={recentPostsCapped}
          />
          <EventSidebarCard />
          <AccountProfile leaderboardEntries={currentRankData?.entries} roomUsers={roomUsers} />
        </>
      )}
      chat={(
        <>
          <EventFloatingLink />
          <Chat leaderboardEntries={currentRankData?.entries} />
        </>
      )}
    >
      {isRoomTab && groupKeys.length > 0 && (
        <RoomTabs activeTab={activeTab} groupKeys={groupKeys} groups={groups} loaded={roomsLoaded} />
      )}
      <AppRoutes
        activeTab={activeTab}
        rooms={rooms}
        bestLeaderboard={best}
        currentRank={currentRankRaw}
        currentRankData={currentRankData}
        roomUsers={roomUsers}
      />
    </AppLayout>
  )
}
