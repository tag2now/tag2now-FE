import { Radio } from 'lucide-react'

/** How many people are in a room right now, on every tab.
 *
 * Above the nav rather than in the header: it is the same kind of fact as the
 * badges on 매칭 and 예약 a few pixels below it, and reading all three in one
 * column is the point. In the header it was a lone figure between the wordmark
 * and the profile, belonging to neither.
 *
 * Rendered only on the roomy layout — the narrow one turns the sidebar into a
 * six-column bottom bar, which has no line to spare. It was already hidden on
 * that layout when it lived in the header, so nothing is lost.
 */
export default function LiveBadge({ totalUsers }: { totalUsers?: number }) {
  return (
    <p className="sidebar-live" aria-label={`${totalUsers ?? 0}명 온라인`}>
      <Radio size={14} aria-hidden="true" />
      <span>Live</span>
      {/* Zero is a real answer and stays out: "Live" alone reads as "nobody is
          on", where a bare 0 beside it reads as a figure that failed to load.
          Same rule the nav badges follow before their first response. */}
      {totalUsers != null && totalUsers > 0 && <strong>{totalUsers}</strong>}
    </p>
  )
}
