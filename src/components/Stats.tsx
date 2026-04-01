import { useState } from 'react'
import { panelStatus } from '@/panelStatus'
import useStats, { type StatsDays } from '@/hooks/useStats'
import type { HourlyActivity } from '@/types'

const DAY_OPTIONS: { value: StatsDays; label: string }[] = [
  { value: 7, label: '7일' },
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
]

const METRIC_OPTIONS: { value: 'avg_players' | 'peak_players'; label: string }[] = [
  { value: 'avg_players', label: '평균' },
  { value: 'peak_players', label: '최대' },
]

interface BarChartProps {
  data: HourlyActivity[]
  metric: 'avg_players' | 'peak_players'
}

function BarChart({ data, metric }: BarChartProps) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>

  const { maxVal, peakHour } = data.reduce(
    (acc, d) => {
      const v = d[metric]
      return {
        maxVal: Math.max(acc.maxVal, v),
        peakHour: v > acc.peakHour[metric] ? d : acc.peakHour,
      }
    },
    { maxVal: 1, peakHour: data[0] },
  )

  return (
    <div className="relative flex gap-2">
      {/* Y-axis labels */}
      <div className="flex flex-col justify-between items-end text-2xs text-txt-dim select-none pb-5 w-5 shrink-0">
        <span>{maxVal}</span>
        <span>{Math.round(maxVal / 2)}</span>
        <span>0</span>
      </div>

      {/* Chart + axis */}
      <div className="flex-1 min-w-0">
        <div className="relative h-44" role="img" aria-label="시간대별 접속자 차트">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full border-t border-border/50" />
            ))}
          </div>

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-px">
            {data.map((d) => {
              const pct = (d[metric] / maxVal) * 100
              const val = d[metric]
              const isPeak = d.hour === peakHour.hour
              return (
                <div
                  key={d.hour}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  title={`${d.hour}시: ${val}`}
                  aria-label={`${d.hour}시: ${val}명`}
                >
                  {val > 0 && (
                    <span className={`absolute bottom-full mb-0.5 text-2xs font-bold leading-none transition-opacity ${
                      isPeak ? 'opacity-100 text-secondary' : 'opacity-0 group-hover:opacity-100 text-txt-dim'
                    }`}>
                      {val}
                    </span>
                  )}
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isPeak ? 'bg-secondary' : 'bg-primary opacity-75 group-hover:opacity-100'
                    }`}
                    style={{ height: pct > 0 ? `${pct}%` : '2px' }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="relative h-5 mt-1">
          {[0, 6, 12, 18, 23].map((h) => (
            <span
              key={h}
              className="absolute text-2xs text-txt-dim"
              style={{ left: `${(h / 23) * 100}%`, transform: 'translateX(-50%)' }}
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-txt-dim font-semibold tracking-wide uppercase">{label}</span>}
      <div className="flex rounded border border-border-light overflow-hidden">
        {options.map((opt, i) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`px-3 py-1 text-xs font-bold tracking-[0.1em] uppercase transition-colors cursor-pointer ${
              i > 0 ? 'border-l border-border-light' : ''
            } ${
              value === opt.value
                ? 'bg-primary text-bg-deep'
                : 'text-txt-dim hover:text-txt hover:bg-primary-hover'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Stats() {
  const { hourly, daily, loading, error, days, setDays } = useStats()
  const [metric, setMetric] = useState<'avg_players' | 'peak_players'>('avg_players')

  const s = panelStatus(loading, error, '통계 로딩 중...')
  if (s) return s

  return (
    <div className="panel">
      {/* Controls row */}
      <div className="flex items-center justify-between mb-5">
        <ToggleGroup options={DAY_OPTIONS} value={days} onChange={setDays} label="기간" />
        <ToggleGroup options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
      </div>

      {/* Hourly chart */}
      <section aria-labelledby="hourly-heading" className="mb-6">
        <h2 id="hourly-heading" className="text-xs font-bold tracking-[0.14em] uppercase text-txt-dim mb-3">
          시간대별 접속자 <span className="text-2xs font-normal opacity-60">(KST)</span>
        </h2>
        <BarChart data={hourly} metric={metric} />
      </section>

      {/* Daily table */}
      <section aria-labelledby="daily-heading">
        <h2 id="daily-heading" className="text-xs font-bold tracking-[0.14em] uppercase text-txt-dim mb-3">
          일별 통계
        </h2>
        {daily.length === 0 ? (
          <p className="state-msg">데이터 없음</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="border-collapse w-full">
              <caption className="sr-only">일별 접속자 통계</caption>
              <thead>
                <tr>
                  <th scope="col" className="tbl-th">날짜</th>
                  <th scope="col" className="tbl-th">최대 접속자</th>
                  <th scope="col" className="tbl-th">평균 접속자</th>
                  {daily[0]?.peak_rooms != null && <th scope="col" className="tbl-th">최대 방</th>}
                  {daily[0]?.avg_rooms != null && <th scope="col" className="tbl-th">평균 방</th>}
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date} className="tbl-row">
                    <td className="tbl-td font-mono text-txt-dim">{row.date}</td>
                    <td className="tbl-td font-bold text-secondary">{row.peak_players}</td>
                    <td className="tbl-td">{typeof row.avg_players === 'number' ? row.avg_players.toFixed(1) : row.avg_players}</td>
                    {row.peak_rooms != null && <td className="tbl-td">{row.peak_rooms}</td>}
                    {row.avg_rooms != null && <td className="tbl-td">{typeof row.avg_rooms === 'number' ? row.avg_rooms.toFixed(1) : row.avg_rooms}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
