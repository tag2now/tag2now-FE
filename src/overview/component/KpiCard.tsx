import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import useCountUp from '@/shared/hooks/useCountUp'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  live?: boolean
  /** Name of the tab this figure is drawn from. Appended to the accessible
   * name — the card's own text says what the number is, not where reading
   * more leads. */
  linkLabel: string
  /** Path of that tab. Required rather than optional: every card on the
   * overview summarises a tab and links to it, so an optional `to` would only
   * add a branch for a card that does not exist. */
  to: string
}

export default function KpiCard({ icon: Icon, label, value, hint, live, linkLabel, to }: KpiCardProps) {
  // `value` is already display-ready and is not always a figure: rooms in
  // flight render an em dash. Only a plain count is worth counting to, and
  // everything else passes through untouched.
  const counted = useCountUp(/^\d+$/.test(value) ? Number(value) : null)
  const shown = counted === null ? value : String(counted)

  return (
    // The whole card is the link. Its parts describe one figure, so a reader
    // aiming at the value or the hint still means "show me this".
    <Link className="kpi-card" to={to}>
      <div className="kpi-card-head">
        <span className="kpi-card-icon"><Icon size={20} aria-hidden="true" /></span>
        <span className="kpi-card-label">{label}</span>
        {/* role="img": the bars are one graphic carrying one meaning, and
            aria-label is only valid on an element that has a role to label. */}
        {live && (
          <span className="kpi-card-live" role="img" aria-label="실시간 갱신">
            <i /><i /><i />
          </span>
        )}
      </div>
      <strong className="kpi-card-value">{shown}</strong>
      {hint && <span className="kpi-card-hint">{hint}</span>}
      {/* Appended rather than set as the link's aria-label. A label would have
          replaced everything above it, and the hint is not repeated anywhere
          else on the card — "활성 방" carries the per-group breakdown there, so
          naming the destination cost a screen reader the only copy of it. */}
      <span className="sr-only">{linkLabel} 탭으로 이동</span>
    </Link>
  )
}
