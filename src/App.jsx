import { useState, useEffect, useCallback } from 'react'
import Leaderboard from './components/Leaderboard'
import Rooms from './components/Rooms'
import { fetchLeaderboard, fetchRoomsAll } from './api'

const REFRESH_INTERVAL = 60_000 // 60 seconds

const TABS = ['Leaderboard', 'Rooms']

export default function App() {
  const [tab, setTab] = useState('Leaderboard')
  const [lb, setLb] = useState({ data: null, loading: true, error: null })
  const [rooms, setRooms] = useState({ data: null, loading: true, error: null })

  const loadLeaderboard = useCallback(() => {
    setLb((s) => ({ ...s, loading: true, error: null }))
    fetchLeaderboard(20)
      .then((data) => setLb({ data, loading: false, error: null }))
      .catch((e) => setLb({ data: null, loading: false, error: e.message }))
  }, [])

  const loadRooms = useCallback(() => {
    setRooms((s) => ({ ...s, loading: true, error: null }))
    fetchRoomsAll()
      .then((data) => setRooms({ data, loading: false, error: null }))
      .catch((e) => setRooms({ data: null, loading: false, error: e.message }))
  }, [])

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
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1>Tekken Tag Tournament 2 — Live</h1>

      <div style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ marginRight: 8, fontWeight: tab === t ? 'bold' : 'normal' }}
          >
            {t}
          </button>
        ))}
        <button onClick={tab === 'Leaderboard' ? loadLeaderboard : loadRooms}>
          Refresh
        </button>
      </div>

      {tab === 'Leaderboard' && <Leaderboard {...lb} />}
      {tab === 'Rooms' && <Rooms {...rooms} />}
    </div>
  )
}
