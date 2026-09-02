import { MEDAL } from '@/shared/medalColors'
import MiniCharCell from '@/overview/component/MiniCharCell'
import type { CharInfo } from '@/shared/types'

export interface TopFiveRow {
  key: string
  /** Identifies the player to the history panel. Distinct from `key`, which is
   * React's list identity and free to change independently. */
  npid: string
  name: string
  /** Right-hand figure — a match count, whatever the list ranks by. Omit it
   * when the position column already says the same thing. */
  detail?: string
  /** Absent when the player is not on the leaderboard, which is why the cells
   * render a dash rather than being dropped: the columns stay aligned. */
  mainChar?: CharInfo | null
  subChar?: CharInfo | null
}

interface TopFiveListProps {
  rows: TopFiveRow[]
  /** Header for the right-hand column, e.g. "매치". Omitting it drops the
   * column outright — the leaderboard ranks by the position already in the
   * first column, so a "랭킹" of 1..5 beside a "#" of 1..5 said it twice. */
  detailLabel?: string
  emptyMsg?: string
  /** Opens the player history panel, the same way the leaderboard does. */
  onSelect: (npid: string) => void
}

export default function TopFiveList({ rows, detailLabel, emptyMsg = '데이터 없음', onSelect }: TopFiveListProps) {
  if (rows.length === 0) return <p className="state-msg">{emptyMsg}</p>

  return (
    <ol className={`overview-rank-list${detailLabel ? '' : ' has-no-detail'}`} aria-label={`상위 ${rows.length}명`}>
      <li className="overview-rank-head" aria-hidden="true">
        <span>#</span><span>Player</span>{detailLabel && <span>{detailLabel}</span>}<span>Main</span><span>Sub</span>
      </li>
      {rows.map((row, i) => {
        const medal = i < 3 ? MEDAL[i] : null
        return (
          <li
            key={row.key}
            className="overview-rank-row"
            style={medal ? { borderLeftColor: medal.border } : undefined}
          >
            <span className="overview-rank-pos" style={medal ? { color: medal.color } : undefined}>{i + 1}</span>
            <span className="overview-rank-name">
              <button type="button" className="player-btn overview-rank-btn" onClick={() => onSelect(row.npid)}>
                {row.name}
              </button>
            </span>
            {row.detail && <span className="overview-rank-detail">{row.detail}</span>}
            <MiniCharCell char={row.mainChar} label="메인" />
            <MiniCharCell char={row.subChar} label="서브" />
          </li>
        )
      })}
    </ol>
  )
}
