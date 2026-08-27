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

function getActivityWindow(hours: number[]) {
  const sorted = [...new Set(hours)].filter((hour) => hour >= 0 && hour < 24).sort((a, b) => a - b)
  if (sorted.length === 0) return { label: '기록 없음', count: 0 }

  let bestStart = sorted[0]
  let bestEnd = sorted[0]
  let currentStart = sorted[0]

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] !== sorted[index - 1] + 1) currentStart = sorted[index]
    if (sorted[index] - currentStart > bestEnd - bestStart) {
      bestStart = currentStart
      bestEnd = sorted[index]
    }
  }

  const endHour = (bestEnd + 1) % 24
  return {
    label: `${String(bestStart).padStart(2, '0')}:00–${String(endHour).padStart(2, '0')}:00`,
    count: sorted.length,
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
        <div className="activity-timeline" aria-label="시간대별 활동 분포">
          <div className="activity-timeline-cells">
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour} className={active.has(hour) ? 'is-active' : ''} title={`${hour}:00`} />
            ))}
          </div>
          <div className="activity-timeline-labels" aria-hidden="true">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
          </div>
        </div>
      </div>
    </div>
  )
}
