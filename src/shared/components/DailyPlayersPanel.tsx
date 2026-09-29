import { useId } from 'react'
import DailyChart from '@/shared/components/DailyChart'
import { completedDays } from '@/shared/util/completedDays'
import type { DailySummary } from '@/stat/types'

/** The daily player chart, with its heading and its exclusion.
 *
 * The home screen and the stats tab both show this panel, and it takes nothing
 * but the rows on purpose. When each page passed its own height, heading level
 * and class, the two drew the same chart at different sizes, and a change
 * checked on one page said nothing about the other. Now both draw it full
 * width, and the chart picks its own arrangement from that width — two plots
 * side by side on a desktop, stacked on a phone — so what one page shows is
 * what the other shows.
 *
 * The heading is h4: each page heads the panel with an h3 of its own — the
 * stats tab's toolbar, the home screen's card.
 */
export default function DailyPlayersPanel({ data }: { data: DailySummary[] }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="chart-panel">
      {/* 06시 because these rows arrive already bucketed by the backend's
          statistics day --- the label reports what the data is, not what this
          app would prefer. 당일 제외 because a reader looking for today should
          learn it is absent from the heading, not by counting the points. */}
      <h4 id={headingId}>
        일별 접속자 <span className="text-2xs font-medium opacity-60">(서버 집계 기준 06시 · 당일 제외)</span>
      </h4>
      {/* The day in progress is dropped here rather than by the caller, so
          neither page can show it by forgetting to filter. The home screen's
          오늘 접속자 card reads the same rows and keeps today; that is a figure
          about right now, where this is a comparison between finished days. */}
      <DailyChart data={completedDays(data)} />
    </section>
  )
}
