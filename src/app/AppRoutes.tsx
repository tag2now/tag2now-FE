import { Route, Routes } from 'react-router-dom'
import { isRoomTab } from '@/config/routes'
import Overview from '@/overview/Overview'
import Rooms from '@/match/Rooms'
import CurrentRankHoldersButton from '@/match/CurrentRankHoldersButton'
import LeaderboardViews from '@/app/LeaderboardViews'
import Reservation from '@/reservation/Reservation'
import Community from '@/community/Community'
import Stats from '@/stat/Stats'
import Admin from '@/admin/Admin'
import type { RoomsData, RoomUser } from '@/match/types'
import type { PolledState } from '@/shared/hooks/usePolledData'
import type { CurrentRankLeaderboard } from '@/shared/currentRankLeaderboard'
import type { LeaderboardData } from '@/shared/types'

interface AppRoutesProps {
  activeTab: string
  rooms: PolledState<RoomsData>
  bestLeaderboard: PolledState<LeaderboardData>
  currentRank: PolledState<CurrentRankLeaderboard>
  currentRankData: LeaderboardData | null
  roomUsers: RoomUser[]
}

export default function AppRoutes({
  activeTab, rooms, bestLeaderboard, currentRank, currentRankData, roomUsers,
}: AppRoutesProps) {
  const leaderboardEntries = bestLeaderboard.data?.entries
  // Admin has no navigation tab; its panel supplies its own accessible name.
  const panelLabel = activeTab === 'admin' ? undefined : isRoomTab(activeTab) ? `tab-${activeTab}` : `primary-tab-${activeTab}`

  const overviewPanel = (
    <Overview
      rooms={rooms.data}
      roomsLoading={rooms.loading}
      leaderboardEntries={leaderboardEntries}
      currentRankEntries={currentRankData?.entries}
      currentRankTotal={currentRankData?.total_records}
    />
  )

  const roomsPanel = (
    <Rooms
      data={rooms.data}
      loading={rooms.loading}
      refreshing={rooms.refreshing}
      error={rooms.error}
      onRefresh={rooms.refresh}
      groupKey={activeTab}
      lastUpdated={rooms.lastUpdated}
      leaderboardEntries={leaderboardEntries}
      actions={(
        <CurrentRankHoldersButton
          roomUsers={roomUsers}
          leaderboardEntries={leaderboardEntries}
          currentRankEntries={currentRankData?.entries}
        />
      )}
    />
  )

  return (
    <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={panelLabel} aria-label={panelLabel ? undefined : '계정 관리'} tabIndex={0}>
      <Routes>
        {/* Unknown paths share the landing screen, as before extraction. */}
        <Route path="/" element={overviewPanel} />
        <Route path="/match/:group" element={roomsPanel} />
        <Route path="/leaderboard/:view?" element={<LeaderboardViews current={currentRank} best={bestLeaderboard} />} />
        <Route path="/reservation" element={<Reservation leaderboardEntries={leaderboardEntries} />} />
        <Route path="/reservation/:id" element={<Reservation leaderboardEntries={leaderboardEntries} />} />
        <Route path="/community" element={<Community leaderboardEntries={leaderboardEntries} />} />
        <Route path="/community/:postId" element={<Community leaderboardEntries={leaderboardEntries} />} />
        <Route path="/stats" element={<Stats leaderboardEntries={leaderboardEntries} />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={overviewPanel} />
      </Routes>
    </div>
  )
}
