import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'

interface OverviewSectionProps {
  icon: LucideIcon
  title: string
  subtitle: string
  /** Label of the tab this section summarises; the link is its entry point. */
  linkLabel: string
  /** Path of that tab. A real link, so the row is middle-clickable and the
   * browser's own back button undoes the jump. */
  to: string
  children: ReactNode
}

export default function OverviewSection({ icon: Icon, title, subtitle, linkLabel, to, children }: OverviewSectionProps) {
  return (
    <section className="overview-section" aria-label={title}>
      <div className="section-toolbar compact-toolbar">
        <div className="section-title">
          <span className="section-icon"><Icon size={15} aria-hidden="true" /></span>
          <div><h3>{title}</h3><p>{subtitle}</p></div>
        </div>
        <Link className="btn-ghost overview-link" to={to}>
          {linkLabel}
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  )
}
