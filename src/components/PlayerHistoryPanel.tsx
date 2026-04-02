import { useState, useEffect } from 'react'
import { GET } from '@/shared/api'
import CharCell from '@/components/CharCell'
import type { PlayerHistory, LeaderboardEntry } from '@/types'

type Days = 7 | 30 | 90

const COLOR_PRIMARY = '#00c8d4'
const COLOR_BORDER = '#1e1e32'
const COLOR_TXT_DIM = '#9ba3cc'
const COLOR_BG_PANEL = '#0d0d1c'

const DAY_OPTIONS: { value: Days; label: string }[] = [
  { value: 7, label: '7일' },
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
]

const ROOM_TYPE_LABELS: Record<string, string> = {
  rank_match: '랭크 매치',
  player_match: '플레이어 매치',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function hourColor(h: number) {
  // yellow (#facc15) at h=0 → red (#f87171) at h=23
  const t = h / 23
  const r = Math.round(250 + (248 - 250) * t)
  const g = Math.round(204 + (113 - 204) * t)
  const b = Math.round(21 + (113 - 21) * t)
  return `rgb(${r},${g},${b})`
}

function sectorPath(h: number, cx: number, cy: number, rInner: number, rOuter: number) {
  const total = 24
  const gap = 0.03
  const startRad = (h * (Math.PI * 2 / total)) - Math.PI / 2 + gap
  const endRad = ((h + 1) * (Math.PI * 2 / total)) - Math.PI / 2 - gap
  const x1 = cx + rInner * Math.cos(startRad), y1 = cy + rInner * Math.sin(startRad)
  const x2 = cx + rOuter * Math.cos(startRad), y2 = cy + rOuter * Math.sin(startRad)
  const x3 = cx + rOuter * Math.cos(endRad),   y3 = cy + rOuter * Math.sin(endRad)
  const x4 = cx + rInner * Math.cos(endRad),   y4 = cy + rInner * Math.sin(endRad)
  return `M${x1} ${y1} L${x2} ${y2} A${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L${x4} ${y4} A${rInner} ${rInner} 0 0 0 ${x1} ${y1}Z`
}

function ActiveHoursClock({ hours }: { hours: number[] }) {
  const active = new Set(hours)
  const cx = 64, cy = 64, rIn = 30, rOut = 56, labelR = 62
  return (
    <svg viewBox="0 0 128 128" className="w-36 h-36 mx-auto block">
      {Array.from({ length: 24 }, (_, h) => (
        <path
          key={h}
          d={sectorPath(h, cx, cy, rIn, rOut)}
          fill={active.has(h) ? hourColor(h) : 'rgba(255,255,255,0.05)'}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.5"
        />
      ))}
      {[0, 6, 12, 18].map((h) => {
        const angle = (h * (Math.PI * 2 / 24)) - Math.PI / 2
        return (
          <text key={h} x={cx + labelR * Math.cos(angle)} y={cy + labelR * Math.sin(angle)}
            textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#9ba3cc">
            {h}
          </text>
        )
      })}
    </svg>
  )
}

interface Props {
  npid: string
  leaderboardEntry?: LeaderboardEntry
  onClose: () => void
}

export default function PlayerHistoryPanel({ npid, leaderboardEntry, onClose }: Props) {
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

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-lg border p-5 mx-auto my-auto"
        style={{ background: COLOR_BG_PANEL, borderColor: COLOR_BORDER }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-wider" style={{ color: COLOR_PRIMARY }}>
            {npid}
          </h2>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-70"
            style={{ color: COLOR_TXT_DIM, borderColor: COLOR_BORDER }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex">
          {/* Leaderboard info */}
          {leaderboardEntry && (
            <div className="flex flex-1 items-center pl-4 pr-6 mb-4 rounded border" style={{ borderColor: COLOR_BORDER }}>
              <span className="flex-1 font-display text-lg font-bold text-center" style={{ color: COLOR_PRIMARY }}>
                #{leaderboardEntry.rank}
              </span>
              <div className="flex flex-col">
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
          )}
        </div>

        {/* Day toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR_TXT_DIM }}>기간</span>
          <div className="flex rounded border overflow-hidden" style={{ borderColor: COLOR_BORDER }}>
            {DAY_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                aria-pressed={days === opt.value}
                className="px-3 py-1 text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer"
                style={{
                  borderLeft: i > 0 ? `1px solid ${COLOR_BORDER}` : undefined,
                  background: days === opt.value ? COLOR_PRIMARY : 'transparent',
                  color: days === opt.value ? COLOR_BG_PANEL : COLOR_TXT_DIM,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="state-msg" role="status">로딩 중...</p>
        )}
        {error && (
          <p className="state-msg error" role="alert">Error: {error}</p>
        )}

        {!loading && !error && data && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: '목격 횟수', value: data.times_seen },
                { label: '활동일', value: data.days_active },
                { label: '첫 플레이', value: formatDate(data.first_seen) },
                { label: '마지막 플레이', value: formatDate(data.last_seen) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded p-2 border" style={{ borderColor: COLOR_BORDER }}>
                  <p className="text-2xs uppercase tracking-wide mb-0.5" style={{ color: COLOR_TXT_DIM }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color: COLOR_PRIMARY }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Room type breakdown */}
            {Object.keys(data.room_type_counts).length > 0 && (
              <section className="mb-4">
                <h3 className="text-xs font-bold tracking-[0.12em] uppercase mb-2" style={{ color: COLOR_TXT_DIM }}>
                  룸 타입별
                </h3>
                <div className="flex flex-col gap-1">
                  {Object.entries(data.room_type_counts).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs px-2 py-1 rounded border" style={{ borderColor: COLOR_BORDER }}>
                      <span style={{ color: COLOR_TXT_DIM }}>{ROOM_TYPE_LABELS[type] ?? type}</span>
                      <span className="font-bold" style={{ color: COLOR_PRIMARY }}>{count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top played with */}
            {data.top_played_with.length > 0 && (
              <section className="mb-4">
                <h3 className="text-xs font-bold tracking-[0.12em] uppercase mb-2" style={{ color: COLOR_TXT_DIM }}>
                  자주 함께한 플레이어
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: COLOR_TXT_DIM }}>
                      <th className="text-left pb-1 font-semibold">닉네임</th>
                      <th className="text-right pb-1 font-semibold">함께한 횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_played_with.map((p) => (
                      <tr key={p.npid} className="border-t" style={{ borderColor: COLOR_BORDER }}>
                        <td className="py-1" style={{ color: COLOR_PRIMARY }}>{p.online_name}</td>
                        <td className="py-1 text-right font-bold" style={{ color: COLOR_TXT_DIM }}>{p.times_together}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Active hours clock chart */}
            {data.active_hours.length > 0 && (
              <section>
                <h3 className="text-xs font-bold tracking-[0.12em] uppercase mb-2" style={{ color: COLOR_TXT_DIM }}>
                  활동 시간대 <span className="font-normal opacity-60">(KST)</span>
                </h3>
                <ActiveHoursClock hours={data.active_hours} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
