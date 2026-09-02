import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  live?: boolean
}

export default function KpiCard({ icon: Icon, label, value, hint, live }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-head">
        <span className="kpi-card-icon"><Icon size={20} aria-hidden="true" /></span>
        <span className="kpi-card-label">{label}</span>
        {live && <span className="kpi-card-live" aria-label="실시간 갱신" />}
      </div>
      <strong className="kpi-card-value">{value}</strong>
      {hint && <span className="kpi-card-hint">{hint}</span>}
    </div>
  )
}
