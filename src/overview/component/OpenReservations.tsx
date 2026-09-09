import { Link } from 'react-router-dom'
import { Clock3, Users } from 'lucide-react'
import { reservationPath } from '@/config/routes'
import type { ApiReservation } from '@/reservation/reservationApi'
import { kstTimeFormat, MATCH_TYPE_LABELS } from '@/reservation/reservationLabels'
import RankSummary from '@/reservation/component/RankSummary'

/** Only reservations still taking people — a full or matched one is not
 * something the reader can act on from a summary screen. */
const isJoinable = (r: ApiReservation) => r.status === 'open' && r.participant_count < r.capacity

export default function OpenReservations({ reservations, limit = 3 }: { reservations: ApiReservation[]; limit?: number }) {
  const joinable = reservations.filter(isJoinable).slice(0, limit)
  // Two lines, the shape panelStatus already uses: the terse uppercase label
  // .state-msg is styled for, then a way forward. An empty board is the best
  // moment to post one, and the card said only that there was nothing here.
  // The second line holds whether the list is genuinely empty or its fetch
  // failed — useOverview degrades a rejection to [], so this cannot claim why.
  if (joinable.length === 0) return (
    <div className="state-msg">
      <p>모집 중인 예약 없음</p>
      <p className="state-msg-detail">예약 탭에서 새 약속을 만들 수 있습니다</p>
    </div>
  )

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
            {/* What the reader is actually deciding on: whether the host's
                ranks are ones they can be matched against. A player match has
                none and RankSummary renders nothing, leaving the slot empty
                rather than repeating the match type the line above states. */}
            <RankSummary ranks={r.host_ranks} imageClassName="h-6" max={2} className="overview-list-ranks" />
            <span className="overview-list-meta">
              <span><Users size={11} aria-hidden="true" />{r.participant_count}/{r.capacity}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
