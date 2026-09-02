import type { ReactNode } from 'react'
import { ArrowRight, type LucideIcon } from 'lucide-react'

interface OverviewSectionProps {
  icon: LucideIcon
  title: string
  subtitle: string
  /** Label of the tab this section summarises; the button is its entry point. */
  linkLabel: string
  onNavigate: () => void
  children: ReactNode
}

export default function OverviewSection({ icon: Icon, title, subtitle, linkLabel, onNavigate, children }: OverviewSectionProps) {
  return (
    <section className="overview-section" aria-label={title}>
      <div className="section-toolbar compact-toolbar">
        <div className="section-title">
          <span className="section-icon"><Icon size={15} aria-hidden="true" /></span>
          <div><h3>{title}</h3><p>{subtitle}</p></div>
        </div>
        <button type="button" className="btn-ghost overview-link" onClick={onNavigate}>
          {linkLabel}
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      </div>
      {children}
    </section>
  )
}
