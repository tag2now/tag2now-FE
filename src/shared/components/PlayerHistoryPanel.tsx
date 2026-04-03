import { useState, useEffect } from 'react'
import { GET} from "@/shared/util/api";
import CharCell from "@/shared/components/CharCell";
import type { LeaderboardEntry} from "@/shared/types";
import type { PlayerHistory } from "@/stat/types";
import ActiveHoursClock from "@/shared/components/ActiveHoursClock";

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

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return iso.slice(0, 10)
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
      className="fixed flex inset-0 z-50 overflow-y-auto p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col relative min-w-80 sm:min-w-180 rounded-lg border p-5 m-auto"
        style={{ background: COLOR_BG_PANEL, borderColor: COLOR_BORDER }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold tracking-wider" style={{ color: COLOR_PRIMARY }}>
            {npid}
          </span>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-70"
            style={{ color: COLOR_TXT_DIM, borderColor: COLOR_BORDER }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col sm:w-1/2">
            <div className="flex">
              {/* Leaderboard info */}
              {leaderboardEntry && (
                <div className="flex flex-1 items-center pl-4 pr-6 mb-4 rounded border" style={{ borderColor: COLOR_BORDER }}>
              <span className="flex-1 font-display text-lg font-bold text-center" style={{ color: COLOR_PRIMARY }}>
                #{leaderboardEntry.rank}
              </span>
                  <div className="flex py-3 sm:flex-col">
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
                    { label: '플레이', value: `${data.times_seen} 판` },
                    { label: '활동일', value: data.days_active },
                    { label: '첫 플레이', value: formatDate(data.first_seen) },
                    { label: '마지막 플레이', value: formatDate(data.last_seen) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded p-2 border" style={{ borderColor: COLOR_BORDER }}>
                      <p className="text-2xs uppercase tracking-wide mb-0.5" style={{ color: COLOR_TXT_DIM }}>{label}</p>
                      <p className="text-base font-bold" style={{ color: COLOR_PRIMARY }}>{value}</p>
                    </div>
                  ))}
                </div>


              </>
            )}
          </div>
          <div className="flex flex-col sm:w-1/2">
            {!loading && !error && data && (
              <>
                {/* Top played with */}
                {data.top_played_with.length > 0 && (
                  <section className="mb-4">
                    <table className="w-full text-xs">
                      <thead>
                      <tr style={{ color: COLOR_TXT_DIM }}>
                        <th className="text-left pb-1 font-semibold">자주 함께한 플레이어</th>
                        <th className="text-right pb-1 font-semibold">함께한 횟수</th>
                      </tr>
                      </thead>
                      <tbody>
                      {data.top_played_with.slice(0,4).map((p) => (
                        <tr key={p.npid} className="border-t text-base font-semibold" style={{ borderColor: COLOR_BORDER }}>
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
                  <section className="flex flex-col flex-1">
                    <h3 className="absolute text-xs font-bold tracking-[0.12em] uppercase mb-2" style={{ color: COLOR_TXT_DIM }}>
                      활동 시간대 <span className="font-normal opacity-60">(KST)</span>
                    </h3>
                    <div className="flex-wrap h-full max-h-50">
                      <ActiveHoursClock hours={data.active_hours} />
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
