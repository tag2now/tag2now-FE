import { MoonStar, Sun } from 'lucide-react'
import { dayHours } from '@/shared/dayBoundary'

const HOURS = dayHours(12)
const MIDNIGHT = HOURS.indexOf(0)
const END = HOURS.length

const AXIS_TICKS = [0, MIDNIGHT, END]
const position = (offset: number) => `${offset / END * 100}%`

function hourLabel(offset: number) {
  const hour = HOURS[offset % END]
  if (hour === 0) return '자정'
  if (hour === 12) return '정오'
  const period = hour < 6 ? '새벽' : hour < 12 ? '오전' : '오후'
  return `${period} ${hour % 12}시`
}

function rangeLabel(start: number, end: number) {
  const nextDay = start < MIDNIGHT && end > MIDNIGHT ? '다음 날 ' : ''
  return `${hourLabel(start)}부터 ${nextDay}${hourLabel(end)}까지`
}

export default function ActiveHoursTimeline({ hours }: { hours: number[] }) {
  const active = new Set(hours)
  const ranges: { start: number; end: number }[] = []
  HOURS.forEach((hour, offset) => {
    if (!active.has(hour)) return
    const previous = ranges.at(-1)
    if (previous?.end === offset) previous.end += 1
    else ranges.push({ start: offset, end: offset + 1 })
  })

  const totalHours = ranges.reduce((total, { start, end }) => total + end - start, 0)
  if (totalHours === 0) {
    return <p className="history-empty">활동 시간 데이터가 아직 없습니다.</p>
  }

  const ticks = AXIS_TICKS.map((offset) => ({ offset, row: 0, isEndpoint: false }))
  // Keep the axis readable when a single run starts or ends close to another tick.
  if (ranges.length === 1) {
    const [{ start, end }] = ranges
    for (const offset of [start, end]) {
      if (AXIS_TICKS.includes(offset)) continue
      let row = 0
      while (ticks.some((tick) => tick.row === row && Math.abs(tick.offset - offset) < 4)) row += 1
      ticks.push({ offset, row, isEndpoint: true })
    }
  }

  return (
    <div className="activity-timeline">
      <div
        className="activity-timeline-chart"
        role="img"
        aria-label={`한국 시간 기준 주요 활동 시간대. ${ranges.map(({ start, end }) => rangeLabel(start, end)).join(', ')}`}
      >
        <div className="activity-timeline-icons" aria-hidden="true">
          <Sun size={24} />
          <MoonStar size={24} />
        </div>
        <div className="activity-timeline-track">
          {ranges.map(({ start, end }) => (
            <span
              key={start}
              className="activity-timeline-range"
              style={{ left: position(start), width: position(end - start) }}
              title={rangeLabel(start, end)}
            />
          ))}
          {ticks.map(({ offset }) => (
            <span
              key={offset}
              className={offset === MIDNIGHT ? 'activity-timeline-midnight' : 'activity-timeline-tick'}
              style={{ left: position(offset) }}
            />
          ))}
        </div>
        <div className="activity-timeline-labels" style={{ height: `${(1 + Math.max(...ticks.map(({ row }) => row))) * 1.4}em` }}>
          {ticks.map(({ offset, row, isEndpoint }) => (
            <span
              key={offset}
              className={isEndpoint ? 'activity-timeline-endpoint' : undefined}
              data-edge={offset === 0 ? 'start' : offset === END ? 'end' : undefined}
              style={{
                left: isEndpoint ? `clamp(2em, ${position(offset)}, 100% - 2em)` : position(offset),
                top: `${row * 1.4}em`,
              }}
            >
              {hourLabel(offset)}
            </span>
          ))}
        </div>
      </div>
      <p className="activity-timeline-caption">하루 중 주요 활동 구간 · {totalHours}시간</p>
    </div>
  )
}
