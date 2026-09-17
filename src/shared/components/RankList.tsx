import { MEDAL } from '@/shared/medalColors'
import MiniCharCell from '@/shared/components/MiniCharCell'
import type { CharInfo } from '@/shared/types'

export interface RankRow {
  /** React's list identity, free to change independently of `npid`. */
  key: string
  /** Identifies the player to the history panel. */
  npid: string
  name: string
  /** The position shown in the first column, and the one the podium colours
   * are keyed off. Defaults to the row's place in the list — which is right
   * for a top-five card and wrong for a filtered leaderboard, where the
   * medals belong to ranks 1-3 rather than to whoever landed in the top rows. */
  rank?: number
  /** The figure the list is ranked by — a win rate, a match count. */
  detail?: string
  /** What that figure is out of, set behind it in the same cell: a rate means
   * little without the matches it was taken over. */
  detailSub?: string
  /** Set when there is no figure to show at all, rather than passing a dash as
   * `detail` — it is styled as an absence, not as a value. */
  detailEmpty?: string
  /** Absent when the player is not on the leaderboard, which is why the cells
   * render a dash rather than being dropped: the columns stay aligned. */
  mainChar?: CharInfo | null
  subChar?: CharInfo | null
  /** Marks the reader's own row. */
  isMe?: boolean
}

interface RankListProps {
  rows: RankRow[]
  /** The heading over `row.detail` — 전적, 판수. Omitted when the list is
   * ranked by nothing but its own order, which drops the column. */
  detailLabel?: string
  /** Names the list to assistive tech; also the table's accessible name. */
  label: string
  emptyMsg?: string
  /** Opens the player history panel. */
  onSelect: (npid: string) => void
}

/** The one ranking list.
 *
 * The leaderboard tab, 이번 주 활동왕 on 통계, and the two summary cards on the
 * home page all show the same five things about the same players — position,
 * name, the figure the list is ranked by, main, sub. They used to be three
 * separate renderings of that: two <table>s of differing column counts and a
 * grid of <li>s, which is why the same player looked like different data
 * depending on which tab you reached them from.
 *
 * It is a grid rather than a <table> because the phone layout puts the figure
 * *under* the name, which table layout cannot express — and it carries the
 * table roles explicitly, so a screen reader still gets column headers and
 * rows rather than a list of unlabelled text. That is more than the markup it
 * replaces gave: the summary lists were <ol>s whose cells had to name
 * themselves in sr-only text.
 */
export default function RankList({ rows, detailLabel, label, emptyMsg = '데이터 없음', onSelect }: RankListProps) {
  if (rows.length === 0) return <p className="state-msg">{emptyMsg}</p>

  return (
    <div className={`rank-list${detailLabel ? '' : ' has-no-detail'}`} role="table" aria-label={label} aria-rowcount={rows.length}>
      <div className="rank-head" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">Player</span>
        {detailLabel && <span role="columnheader">{detailLabel}</span>}
        <span role="columnheader">Main</span>
        <span role="columnheader">Sub</span>
      </div>
      {rows.map((row, i) => {
        const place = row.rank ?? i + 1
        const medal = place <= 3 ? MEDAL[place - 1] : null
        const medalStyle = medal ? { '--medal': medal.color } as React.CSSProperties : undefined
        return (
          <div
            key={row.key}
            role="row"
            className={`rank-row${medal ? ' is-podium' : ''}${row.isMe ? ' is-me' : ''}`}
            style={medalStyle}
          >
            <span role="cell" className={`rank-no${medal ? ' is-podium' : ''}`} style={medalStyle}>{place}</span>
            <span role="cell" className="rank-name">
              {/* The button stretches over the whole row in CSS, so a reader
                  aiming at the portrait or the figure opens the same player
                  the name does. The label is a span of its own because the
                  ellipsis needs `overflow: hidden`, and that would clip the
                  very overlay that does the stretching. The title carries the
                  whole name to a pointer once the ellipsis has cut it. */}
              <button
                type="button"
                className="player-btn rank-btn"
                onClick={() => onSelect(row.npid)}
                title={row.name}
                style={medal ? { color: medal.color } : undefined}
              >
                <span className="rank-btn-label">{row.name}</span>
              </button>
              {row.isMe && <span className="lb-you">나</span>}
            </span>
            {detailLabel && (
              <span role="cell" className="rank-detail">
                {row.detailEmpty
                  ? <span className="rank-detail-empty">{row.detailEmpty}</span>
                  : <><strong>{row.detail ?? '—'}</strong>{row.detailSub && <span>{row.detailSub}</span>}</>}
              </span>
            )}
            <MiniCharCell role="cell" char={row.mainChar} label="메인" />
            <MiniCharCell role="cell" char={row.subChar} label="서브" />
          </div>
        )
      })}
    </div>
  )
}
