import { useState } from 'react'
import Leaderboard from "@/shared/Leaderboard";
import Stats from "@/stat/Stats"
import Header from "@/shared/components/Header";
import Footer from "@/shared/components/Footer";
import PatchNotes from "@/shared/components/PatchNotes";
import useLeaderboard from "@/shared/hooks/useLeaderboard";
import useRooms from "@/match/useRooms";
import Community from "@/community/Community";
import MatchingOverview from "@/match/MatchingOverview";
import Reservation from "@/reservation/Reservation";

export default function App() {
  const [tab, setTab] = useState<string | null>(null)
  const lb = useLeaderboard()
  const rooms = useRooms()

  const groups = rooms.data?.groups ?? {}
  const tabs = [
    { key: 'matching', label: '매칭 현황' },
    { key: 'reservation', label: '예약' },
    { key: 'leaderboard', label: '리더보드' },
    { key: 'community', label: '커뮤니티' },
    { key: 'stats', label: '통계' },
  ]

  const activeTab = tab && tabs.some((item) => item.key === tab) ? tab : 'matching'

  return (
    <div className="flex flex-col items-center pb-12">
      <PatchNotes />
      <Header totalUsers={rooms.data?.totalUsers} leaderboardEntries={lb.data?.entries} />
      <div className="flex w-full justify-center md:px-8 py-4">
        <div id="mainContent" className="w-full max-w-240">
          <nav className=" flex items-end flex-nowrap border-b border-border-light pb-0 overflow-x-auto overflow-y-hidden whitespace-nowrap" role="tablist" aria-label="Main navigation">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={activeTab === t.key}
                aria-controls={`tabpanel-${t.key}`}
                tabIndex={activeTab === t.key ? 0 : -1}
                onClick={() => setTab(t.key)}
                onKeyDown={(e) => {
                  const idx = tabs.findIndex(x => x.key === t.key)
                  let next = -1
                  if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length
                  if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length
                  if (next >= 0) {
                    e.preventDefault()
                    setTab(tabs[next].key)
                    document.getElementById(`tab-${tabs[next].key}`)?.focus()
                  }
                }}
                className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
            {activeTab === 'matching' && (
              <MatchingOverview
                groups={groups}
                loading={rooms.loading}
                refreshing={rooms.refreshing}
                error={rooms.error}
                onRefresh={rooms.refresh}
                lastUpdated={rooms.lastUpdated}
                leaderboardEntries={lb.data?.entries}
              />
            )}
            {activeTab === 'leaderboard' && <Leaderboard data={lb.data} loading={lb.loading} refreshing={lb.refreshing} error={lb.error} onRefresh={lb.refresh} />}
            {activeTab === 'reservation' && <Reservation />}
            {activeTab === 'community' && <Community leaderboardEntries={lb.data?.entries} />}
            {activeTab === 'stats' && <Stats leaderboardEntries={lb.data?.entries} />}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
