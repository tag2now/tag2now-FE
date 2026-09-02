import { useEffect, useState } from 'react'
import {
  Activity,
  CalendarDays,
  Clock3,
  Eye,
  Trophy,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { GET } from '@/shared/util/api'
import useModalDialog from '@/shared/hooks/useModalDialog'
import CharCell from '@/shared/components/CharCell'
import ActiveHoursClock from '@/shared/components/ActiveHoursClock'
import type { LeaderboardEntry } from '@/shared/types'
import type { PlayerHistory } from '@/stat/types'

type Days = 7 | 30 | 90

const DAY_OPTIONS: { value: Days; label: string }[] = [
  { value: 7, label: '7일' },
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
]

function formatDate(iso: string | null) {
  if (!iso) return '기록 없음'
  return iso.slice(0, 10)
}

interface Props {
  npid: string
  leaderboardEntry?: LeaderboardEntry
  onClose: () => void
}

export default function PlayerHistoryPanel({ npid, leaderboardEntry, onClose }: Props) {
  const dialogRef = useModalDialog<HTMLDivElement>(onClose)
  const [days, setDays] = useState<Days>(30)
  const [data, setData] = useState<PlayerHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    GET(`history/players/${npid}`, { days })
      .then((res) => {
        if (cancelled) return
        setData(res as PlayerHistory)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [npid, days])

  const metrics = data ? [
    { label: '확인된 플레이', value: `${data.times_seen}회`, icon: Eye },
    { label: '활동 일수', value: `${data.days_active}일`, icon: CalendarDays },
    { label: '첫 플레이', value: formatDate(data.first_seen), icon: Clock3 },
    { label: '최근 플레이', value: formatDate(data.last_seen), icon: Activity },
  ] : []

  return (
    <div className="modal-backdrop history-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="history-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="history-header">
          <div className="history-title-group">
            <span className="history-title-icon" aria-hidden="true"><UserRound size={18} /></span>
            <div>
              <p className="history-eyebrow">PLAYER INSIGHTS</p>
              <h2 id="history-title">{npid}</h2>
              <p>플레이 기록과 활동 패턴을 한눈에 확인하세요.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="플레이어 기록 닫기">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <div className="history-toolbar">
          {leaderboardEntry ? (
            <div className="history-rank-summary">
              <span className="history-rank-icon" aria-hidden="true"><Trophy size={16} /></span>
              <div className="history-rank-copy">
                <small>현재 순위</small>
                <strong>#{leaderboardEntry.rank}</strong>
              </div>
              <div className="history-character-pair" aria-label="주 캐릭터와 부 캐릭터">
                <CharCell
                  name={leaderboardEntry.player_info?.main_char_info?.name}
                  rankInfo={leaderboardEntry.player_info?.main_char_info?.rank_info}
                  wins={leaderboardEntry.player_info?.main_char_info?.wins}
                  losses={leaderboardEntry.player_info?.main_char_info?.losses}
                />
                <CharCell
                  name={leaderboardEntry.player_info?.sub_char_info?.name}
                  rankInfo={leaderboardEntry.player_info?.sub_char_info?.rank_info}
                  wins={leaderboardEntry.player_info?.sub_char_info?.wins}
                  losses={leaderboardEntry.player_info?.sub_char_info?.losses}
                />
              </div>
            </div>
          ) : <div className="history-toolbar-label"><Activity size={15} /> 활동 분석</div>}

          <div className="history-period" role="group" aria-label="조회 기간">
            {DAY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setDays(option.value)}
                aria-pressed={days === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="state-msg history-state" role="status">플레이 기록을 불러오는 중입니다.</p>}
        {error && <p className="state-msg history-state error" role="alert">기록을 불러오지 못했습니다: {error}</p>}

        {!loading && !error && data && (
          <div className="history-body">
            <section className="history-metrics" aria-label="플레이 요약">
              {metrics.map(({ label, value, icon: Icon }) => (
                <div key={label} className="history-stat">
                  <span aria-hidden="true"><Icon size={15} /></span>
                  <div><small>{label}</small><strong>{value}</strong></div>
                </div>
              ))}
            </section>

            <div className="history-content-grid">
              <section className="history-section">
                <div className="history-section-heading">
                  <div><UsersRound size={17} aria-hidden="true" /><h3>자주 함께한 플레이어</h3></div>
                  <span>TOP 4</span>
                </div>
                {data.top_played_with.length > 0 ? (
                  <ol className="history-partner-list">
                    {data.top_played_with.slice(0, 4).map((player, index) => (
                      <li key={player.npid}>
                        <span className="history-partner-rank">{index + 1}</span>
                        <span className="history-partner-name">{player.online_name}</span>
                        <strong>{player.times_together}<small>회</small></strong>
                      </li>
                    ))}
                  </ol>
                ) : <p className="history-empty">함께 플레이한 기록이 아직 없습니다.</p>}
              </section>

              <section className="history-section history-activity">
                <div className="history-section-heading">
                  <div><Clock3 size={17} aria-hidden="true" /><h3>주요 활동 시간</h3></div>
                  <span>KST · 24H</span>
                </div>
                {data.active_hours.length > 0 ? (
                  <div className="history-clock"><ActiveHoursClock hours={data.active_hours} /></div>
                ) : <p className="history-empty">활동 시간 데이터가 아직 없습니다.</p>}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
