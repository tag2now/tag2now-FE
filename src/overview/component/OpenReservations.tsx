import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, Users } from 'lucide-react'
import { pathOf, reservationPath } from '@/config/routes'
import type { ApiReservation } from '@/reservation/reservationApi'
import { isJoinable, kstDayLabel, kstTimeFormat, MATCH_TYPE_LABELS } from '@/reservation/reservationLabels'
import RankSummary from '@/reservation/component/RankSummary'

/** The soonest few, and how many it could not fit.
 *
 * `fetchReservations` hands over the whole list, so this component *knows* the
 * total — and the KPI card above it prints that total. Slicing to `limit`
 * without saying so put "모집 중인 예약 4" directly above three rows under
 * the same heading, and the only way to tell which was wrong was to open the
 * tab. The remainder is a row of its own rather than a badge on the heading:
 * it lands where the reader's eye already is, at the end of the list, and it
 * doubles as the way to the rest.
 *
 * 최신 게시글 needs none of this. `fetchPosts(1, 3)` asks the backend for three
 * and is given three, so there is no total to contradict — a "latest" list is
 * a slice by definition and nothing on the page claims otherwise.
 */
// Two, matching OVERVIEW_POSTS in the card beside it: the pair share a grid
// row, so a third here sets the height of both. Nothing is dropped -- the
// remainder row below says how many are left and leads to them.
export default function OpenReservations({ reservations, limit = 2 }: { reservations: ApiReservation[]; limit?: number }) {
  const joinable = reservations.filter(isJoinable)
  const shown = joinable.slice(0, limit)
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

  const hidden = joinable.length - shown.length
  // Which day, not just which hour: the listing runs to the next morning, so
  // a bare time cannot tell tonight's 23:00 from the 01:00 after it.
  const now = new Date()

  return (
    <ul className="overview-list">
      {shown.map((r) => (
        <li key={r.id}>
          <Link className="overview-list-row overview-list-link" to={reservationPath(r.id)}>
            <span className="overview-time"><Clock3 size={11} aria-hidden="true" />{kstDayLabel(new Date(r.start_at), now)} {kstTimeFormat.format(new Date(r.start_at))}</span>
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
      {hidden > 0 && (
        <li>
          <Link className="overview-list-row overview-list-more" to={pathOf('reservation')}>
            외 {hidden}건 더 보기
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </li>
      )}
    </ul>
  )
}
