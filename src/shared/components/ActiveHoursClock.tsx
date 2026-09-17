import { DAY_START_HOUR, dayHours, hourLabel as hh } from '@/shared/dayBoundary'
function sectorPath(hour: number, cx: number, cy: number, innerRadius: number, outerRadius: number) {
  const gap = 0.045
  const start = hour * (Math.PI * 2 / 24) - Math.PI / 2 + gap
  const end = (hour + 1) * (Math.PI * 2 / 24) - Math.PI / 2 - gap
  const x1 = cx + innerRadius * Math.cos(start)
  const y1 = cy + innerRadius * Math.sin(start)
  const x2 = cx + outerRadius * Math.cos(start)
  const y2 = cy + outerRadius * Math.sin(start)
  const x3 = cx + outerRadius * Math.cos(end)
  const y3 = cy + outerRadius * Math.sin(end)
  const x4 = cx + innerRadius * Math.cos(end)
  const y4 = cy + innerRadius * Math.sin(end)
  return `M${x1} ${y1} L${x2} ${y2} A${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L${x4} ${y4} A${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}Z`
}

/** The strip below the ring reads from the day boundary rather than from
 *  00:00, so a 22-02 session is one block at the right-hand end instead of two
 *  stubs pinned to opposite edges. The boundary itself lives in
 *  `shared/dayBoundary`, which the stats tab's hourly chart reads too. */
const STRIP_HOURS = dayHours()
/** Five marks, one every six hours, starting and ending at the boundary. */
const STRIP_LABELS = Array.from({ length: 5 }, (_, step) => hh((DAY_START_HOUR + step * 6) % 24))

/** The longest unbroken run of active hours, measured around the clock.
 *  A late-night player is active 22–03, one run through midnight --- reading
 *  the hours as a flat 0–23 line would report it as two and show the shorter. */
function getActivityWindow(hours: number[]) {
  const active = new Set(hours.filter((hour) => Number.isInteger(hour) && hour >= 0 && hour < 24))
  if (active.size === 0) return { label: '기록 없음', count: 0 }
  if (active.size === 24) return { label: '00:00–24:00', count: 24 }

  // Start where a run can start: an active hour whose predecessor is not.
  const startsARun = (hour: number) => active.has(hour) && !active.has((hour + 23) % 24)
  let bestStart = 0
  let bestLength = 0
  for (const start of Array.from(active).filter(startsARun)) {
    let length = 1
    while (active.has((start + length) % 24)) length += 1
    if (length > bestLength) {
      bestStart = start
      bestLength = length
    }
  }

  const endHour = (bestStart + bestLength) % 24
  return {
    label: `${String(bestStart).padStart(2, '0')}:00–${String(endHour).padStart(2, '0')}:00`,
    count: active.size,
  }
}

export default function ActiveHoursClock({ hours }: { hours: number[] }) {
  const active = new Set(hours)
  const insight = getActivityWindow(hours)
  const cx = 80
  const cy = 80
  const innerRadius = 50
  const outerRadius = 62

  return (
    <div className="activity-insight">
      <div className="activity-ring-wrap">
        <svg viewBox="0 0 160 160" role="img" aria-label={`주요 활동 시간 ${insight.label}, 총 ${insight.count}시간`}>
          <circle cx={cx} cy={cy} r="42" className="activity-ring-inner" />
          {Array.from({ length: 24 }, (_, hour) => (
            <path
              key={hour}
              d={sectorPath(hour, cx, cy, innerRadius, outerRadius)}
              className={active.has(hour) ? 'activity-segment is-active' : 'activity-segment'}
            >
              <title>{`${String(hour).padStart(2, '0')}:00 ${active.has(hour) ? '활동' : '비활동'}`}</title>
            </path>
          ))}
          {[0, 6, 12, 18].map((hour) => {
            const angle = hour * (Math.PI * 2 / 24) - Math.PI / 2
            const labelRadius = 72
            return (
              <text
                key={hour}
                x={cx + labelRadius * Math.cos(angle)}
                y={cy + labelRadius * Math.sin(angle)}
                className="activity-hour-label"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {String(hour).padStart(2, '0')}
              </text>
            )
          })}
        </svg>
        <div className="activity-ring-center" aria-hidden="true">
          <small>집중 활동</small>
          <strong>{insight.label}</strong>
          <span>KST 기준</span>
        </div>
      </div>

      <div className="activity-summary">
        <div className="activity-summary-copy">
          <span><i aria-hidden="true" /> ACTIVE WINDOW</span>
          <strong>{insight.count}<small> / 24시간</small></strong>
        </div>
        <div className="activity-timeline" aria-label={`시간대별 활동 분포 (${hh(DAY_START_HOUR)}시 기준)`}>
          <div className="activity-timeline-cells">
            {STRIP_HOURS.map((hour) => (
              <span
                key={hour}
                className={`${active.has(hour) ? 'is-active' : ''}${hour === 0 ? ' starts-next-day' : ''}`}
                title={`${hh(hour)}:00`}
              />
            ))}
          </div>
          <div className="activity-timeline-labels" aria-hidden="true">
            {STRIP_LABELS.map((label, step) => <span key={step}>{label}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}
