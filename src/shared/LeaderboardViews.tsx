import { useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Leaderboard from '@/shared/Leaderboard'
import { leaderboardPath, type LeaderboardView } from '@/config/routes'
import type { PolledState } from '@/shared/hooks/usePolledData'
import type { LeaderboardData } from '@/shared/types'

const VIEWS: { value: LeaderboardView; label: string }[] = [
  { value: 'current', label: '현재 계급' },
  { value: 'best', label: '최고 계급' },
]

const ARROW_STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }

interface Props {
  /** Players by the rank they hold now, named from the score board. */
  current: PolledState<LeaderboardData>
  /** The score board: the highest rank each player reached. */
  best: PolledState<LeaderboardData>
}

/** The leaderboard tab: players by the ranks they hold now, which it opens on,
 * or by the highest they reached. The view is the URL (`leaderboardPath`), so
 * the back button and a shared link land on the same board. */
export default function LeaderboardViews({ current, best }: Props) {
  const view: LeaderboardView = useParams().view === 'best' ? 'best' : 'current'
  const board = view === 'best' ? best : current

  return (
    <>
      <ViewTabs value={view} />
      <div role="tabpanel" id="leaderboard-view-panel" aria-labelledby={`leaderboard-view-${view}`}>
        <Leaderboard data={board.data} loading={board.loading} refreshing={board.refreshing} error={board.error} onRefresh={board.refresh} />
      </div>
    </>
  )
}

function ViewTabs({ value }: { value: LeaderboardView }) {
  const navigate = useNavigate()
  const buttons = useRef<Partial<Record<LeaderboardView, HTMLButtonElement | null>>>({})

  const step = (event: React.KeyboardEvent, index: number) => {
    const delta = ARROW_STEP[event.key]
    if (!delta) return
    event.preventDefault()
    const next = VIEWS[(index + delta + VIEWS.length) % VIEWS.length].value
    navigate(leaderboardPath(next))
    buttons.current[next]?.focus()
  }

  return (
    <div className="lb-views" role="tablist" aria-label="랭킹 기준">
      {VIEWS.map((option, index) => (
        <button
          key={option.value}
          ref={(button) => { buttons.current[option.value] = button }}
          type="button"
          role="tab"
          id={`leaderboard-view-${option.value}`}
          aria-controls="leaderboard-view-panel"
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className="lb-view"
          onClick={() => navigate(leaderboardPath(option.value))}
          onKeyDown={(event) => step(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
