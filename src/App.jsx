import { useState, useEffect, useCallback } from 'react'
import Leaderboard from './components/Leaderboard'
import Rooms from './components/Rooms'
import { fetchLeaderboard, fetchRoomsAll } from './api'

const REFRESH_INTERVAL = 60_000 // 60 seconds

const TABS = ['Leaderboard', 'Rooms']

function load(fetcher, setState) {
  setState((s) => ({ ...s, loading: true, error: null }))
  fetcher()
    .then((data) => setState({ data, loading: false, error: null }))
    .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })))
}

export default function App() {
  const [tab, setTab] = useState('Leaderboard')
  const [lb, setLb] = useState({ data: null, loading: true, error: null })
  const [rooms, setRooms] = useState({ data: null, loading: true, error: null })

  const loadLeaderboard = useCallback(() => load(() => fetchLeaderboard(20), setLb), [])
  const loadRooms = useCallback(() => load(fetchRoomsAll, setRooms), [])

  useEffect(() => {
    loadLeaderboard()
    loadRooms()
    const timer = setInterval(() => {
      loadLeaderboard()
      loadRooms()
    }, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [loadLeaderboard, loadRooms])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tekken Tag Tournament 2</h1>
        <div className="live-badge">
          <span className="live-dot" />
          Live
        </div>
      </header>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-btn${tab === t ? ' active' : ''}`}
          >
            {t}
          </button>
        ))}
        <button
          className="refresh-btn"
          aria-label="Refresh"
          onClick={tab === 'Leaderboard' ? loadLeaderboard : loadRooms}
        >
          ↻ Refresh
        </button>
      </nav>

      {tab === 'Leaderboard' && <Leaderboard {...lb} />}
      {tab === 'Rooms' && <Rooms {...rooms} />}
    </div>
  )
}
