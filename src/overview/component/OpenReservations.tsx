import { Link } from 'react-router-dom'
import { Clock3, Users } from 'lucide-react'
import { reservationPath } from '@/config/routes'
import type { ApiReservation } from '@/reservation/reservationApi'
import { kstTimeFormat, MATCH_TYPE_LABELS } from '@/reservation/reservationLabels'

/** Only reservations still taking people — a full or matched one is not
 * something the reader can act on from a summary screen. */
const isJoinable = (r: ApiReservation) => r.status === 'open' && r.participant_count < r.capacity

export default function OpenReservations({ reservations, limit = 3 }: { reservations: ApiReservation[]; limit?: number }) {
  const joinable = reservations.filter(isJoinable).slice(0, limit)
  if (joinable.length === 0) return <p className="state-msg">모집 중인 예약 없음</p>

  return (
    <ul className="overview-list">
      {joinable.map((r) => (
        <li key={r.id}>
          <Link className="overview-list-row overview-list-link" to={reservationPath(r.id)}>
            <span className="overview-time"><Clock3 size={11} aria-hidden="true" />{kstTimeFormat.format(new Date(r.start_at))}</span>
            <div className="overview-list-main">
              <span className="overview-list-title">{r.host_display_name}</span>
              <span className="overview-list-sub">{MATCH_TYPE_LABELS[r.match_type]}</span>
            </div>
            <span className="overview-list-meta">
              <span><Users size={11} aria-hidden="true" />{r.participant_count}/{r.capacity}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
