import DailyChart from '@/shared/components/DailyChart'
import { completedDays } from '@/shared/util/completedDays'
import type { DailySummary } from '@/stat/types'

/** The daily player chart, with its heading and its exclusion.
 *
 * Both pages that show this chart show the same thing: the same rows, the same
 * title, the same reason today is missing. Only the height and the heading
 * level differ --- the level because each page has its own outline, and a
 * section that hard-codes h3 skips a level wherever the page nests it deeper.
 *
 * The day in progress is dropped here rather than by the caller, so neither
 * page can show it by forgetting to filter. The overview's 오늘 접속자 card
 * reads the same rows and keeps today; that is a figure about right now, where
 * this is a comparison between finished days.
 */
export default function DailyPlayersPanel({
  data,
  height,
  headingId,
  headingLevel = 3,
  className = '',
}: {
  data: DailySummary[]
  height?: number
  headingId: string
  /** Extra classes for the section --- the overview's own padding, say. */
  className?: string
  /** 3 on the overview, where this sits beside the card sections; 4 on the
   *  stats tab, where the toolbar's h3 heads the pair of charts above it. */
  headingLevel?: 3 | 4
}) {
  const Heading = `h${headingLevel}` as const

  return (
    <section className={`chart-panel ${className}`.trim()} aria-labelledby={headingId}>
      {/* 06시 because these rows arrive already bucketed by the backend's
          statistics day --- the label reports what the data is, not what this
          app would prefer. 당일 제외 because a reader looking for today should
          learn it is absent from the heading, not by counting the points. */}
      <Heading id={headingId}>
        일별 접속자 <span className="text-2xs font-medium opacity-60">(서버 집계 기준 06시 · 당일 제외)</span>
      </Heading>
      <DailyChart data={completedDays(data)} height={height} />
    </section>
  )
}
