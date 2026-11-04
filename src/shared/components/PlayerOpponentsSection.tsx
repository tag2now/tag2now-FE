import { useEffect, useState } from 'react'
import { UsersRound } from 'lucide-react'
import { API } from '@/config/endpoints'
import { GET } from '@/shared/util/api'
import type { OpponentRecord } from '@/shared/playerHistoryTypes'

type State =
  | { kind: 'loading' }
  | { kind: 'loaded', opponents: OpponentRecord[] }
  | { kind: 'failed' }

/** Counted from recorded matches rather than the play history, so it loads on
 * its own. A row opens that opponent in the same panel. */
export default function PlayerOpponentsSection({ npid, days, onOpen }: {
  npid: string
  days: number
  onOpen: (npid: string) => void
}) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    GET<OpponentRecord[]>(API.playerOpponents().path, { npid, days })
      .then((opponents) => { if (!cancelled) setState({ kind: 'loaded', opponents }) })
      .catch(() => { if (!cancelled) setState({ kind: 'failed' }) })
    return () => { cancelled = true }
  }, [npid, days])

  return (
    <section className="history-section">
      <div className="history-section-heading">
        <div><UsersRound size={17} aria-hidden="true" /><h3>자주 함께한 플레이어</h3></div>
        <span>TOP 4</span>
      </div>
      <OpponentsBody state={state} onOpen={onOpen} />
    </section>
  )
}

function OpponentsBody({ state, onOpen }: { state: State, onOpen: (npid: string) => void }) {
  switch (state.kind) {
    case 'loading':
      return <p className="history-empty" role="status">함께한 플레이어를 불러오는 중입니다.</p>
    case 'failed':
      return <p className="history-empty" role="alert">함께한 플레이어를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>
    case 'loaded':
      return state.opponents.length > 0
        ? <OpponentList opponents={state.opponents} onOpen={onOpen} />
        : <p className="history-empty">함께 플레이한 기록이 아직 없습니다.</p>
  }
}

function OpponentList({ opponents, onOpen }: { opponents: OpponentRecord[], onOpen: (npid: string) => void }) {
  return (
    <ol className="history-partner-list">
      {opponents.map((opponent, index) => (
        <li key={opponent.npid}>
          {/* The whole row opens that player — the position and the record
              describe the same person the name does. */}
          <button
            type="button"
            className="history-partner-row"
            onClick={() => onOpen(opponent.npid)}
            aria-label={`${opponent.online_name} 기록 보기`}
          >
            <span className="history-partner-rank">{index + 1}</span>
            <span className="history-partner-name">{opponent.online_name}</span>
            <span className="history-partner-record">
              <span className="history-partner-count">{opponent.match_count}판</span>
              <span className="is-win">{opponent.wins}<small>W</small></span>
              <span className="is-loss">{opponent.losses}<small>L</small></span>
            </span>
            <strong>{Math.round(opponent.wins / opponent.match_count * 100)}<small>%</small></strong>
          </button>
        </li>
      ))}
    </ol>
  )
}
