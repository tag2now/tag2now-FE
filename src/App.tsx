import { useState, useMemo } from 'react'
import Leaderboard from './components/Leaderboard'
import Rooms from './components/Rooms'
import Community from './components/Community'
import Stats from './components/Stats'
import Header from './components/Header'
import Footer from './components/Footer'
import PatchNotes from './components/PatchNotes'
import { GROUP_ORDER, formatGroupName } from './tabConfig'
import useLeaderboard from './hooks/useLeaderboard'
import useRooms from './hooks/useRooms'
import GoogleAdvertise from "@/components/GoogleAdvertise";

export default function App() {
  const [tab, setTab] = useState<string | null>(null)
  const lb = useLeaderboard()
  const rooms = useRooms()

  const groups = rooms.data?.groups ?? {}
  const groupKeys = useMemo(() => {
    const known = GROUP_ORDER.filter((k) => k in groups)
    const rest = Object.keys(groups).filter((k) => !GROUP_ORDER.includes(k))
    return [...known, ...rest]
  }, [groups])

  const tabs = useMemo(
    () => [...groupKeys.map((k) => ({ key: k, label: `${formatGroupName(k)} (${groups[k].length})` })),
           { key: 'leaderboard', label: '리더보드' },
           { key: 'community', label: '커뮤니티' },
           { key: 'stats', label: '통계' }],
    [groupKeys, groups],
  )

  // Default to first room group tab, or leaderboard if no groups
  const activeTab = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key ?? 'leaderboard'
  const isRoomTab = activeTab !== 'leaderboard' && activeTab !== 'community' && activeTab !== 'stats'

  const activeRoomsData = isRoomTab
    ? { rooms: groups[activeTab] ?? [] }
    : null

  return (
    <div className="flex flex-col items-center pb-12">
      <PatchNotes />
      <Header totalUsers={rooms.data?.totalUsers} leaderboardEntries={lb.data?.entries} />
      <div className="flex w-full justify-around md:px-8 py-4">
        <GoogleAdvertise
          className={"adsbygoogle hidden xl:block"}
          client={"ca-pub-1216394999861449"}
          slot={"4642693487"}
          format={"auto"}
          responsive={"true"}
          layoutKey={""}
        />
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
            {isRoomTab && (
              <Rooms
                data={activeRoomsData}
                loading={rooms.loading}
                refreshing={rooms.refreshing}
                error={rooms.error}
                onRefresh={rooms.refresh}
                groupKey={activeTab}
                lastUpdated={rooms.lastUpdated}
              />
            )}
            {!isRoomTab && (rooms.loading || rooms.error) && groupKeys.length === 0 && (
              <Rooms data={null} loading={rooms.loading} error={rooms.error} onRefresh={rooms.refresh} lastUpdated={rooms.lastUpdated} />
            )}
            {activeTab === 'leaderboard' && <Leaderboard data={lb.data} loading={lb.loading} refreshing={lb.refreshing} error={lb.error} onRefresh={lb.refresh} />}
            {activeTab === 'community' && <Community leaderboardEntries={lb.data?.entries} />}
            {activeTab === 'stats' && <Stats leaderboardEntries={lb.data?.entries} />}
          </div>
        </div>
        <GoogleAdvertise
          className={"adsbygoogle hidden xl:block"}
          client={"ca-pub-1216394999861449"}
          slot={"4642693487"}
          format={"auto"}
          responsive={"true"}
          layoutKey={""}
        />
      </div>
      <Footer />
    </div>
  )
}
