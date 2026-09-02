import { MEDAL } from '@/shared/medalColors'
import MiniCharCell from '@/overview/component/MiniCharCell'
import type { CharInfo } from '@/shared/types'

export interface TopFiveRow {
  key: string
  name: string
  /** Right-hand figure — a rank number, a match count, whatever the list ranks by. */
  detail: string
  /** Absent when the player is not on the leaderboard, which is why the cells
   * render a dash rather than being dropped: the columns stay aligned. */
  mainChar?: CharInfo | null
  subChar?: CharInfo | null
}

interface TopFiveListProps {
  rows: TopFiveRow[]
  /** Header for the right-hand column, e.g. "랭킹" or "매치". */
  detailLabel: string
  emptyMsg?: string
}

export default function TopFiveList({ rows, detailLabel, emptyMsg = '데이터 없음' }: TopFiveListProps) {
  if (rows.length === 0) return <p className="state-msg">{emptyMsg}</p>

  return (
    <ol className="overview-rank-list" aria-label={`상위 ${rows.length}명`}>
      <li className="overview-rank-head" aria-hidden="true">
        <span>#</span><span>Player</span><span>Main</span><span>Sub</span><span>{detailLabel}</span>
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
            <span className="overview-rank-name">{row.name}</span>
            <MiniCharCell char={row.mainChar} label="메인" />
            <MiniCharCell char={row.subChar} label="서브" />
            <span className="overview-rank-detail">{row.detail}</span>
          </li>
        )
      })}
    </ol>
  )
}
