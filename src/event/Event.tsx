import { useState } from 'react'
import { Gift, RefreshCw } from 'lucide-react'
import useAuth from '@/auth/useAuth'
import RankList, { type RankRow } from '@/shared/components/RankList'
import { TableSkeleton } from '@/shared/components/Skeleton'
import { statusBody } from '@/shared/util/panelStatus'
import useEvent from '@/event/useEvent'
import { formatEventTime } from '@/event/eventTime'
import { EventProgress, EventRules } from '@/event/component'
import type { EventAchiever, EventBoard } from '@/event/types'

const CHAR_COLUMNS = { main: '시작', sub: '현재' }

function achieverRow(a: EventAchiever, me: string | null): RankRow {
  const flags = [a.new_player && '신규 심사', a.number_only && '숫자단 심사'].filter(Boolean)
  const name = a.char.character
  return {
    key: a.username,
    npid: a.username,
    name: a.username,
    rank: a.place,
    detail: `+${a.gain}`,
    detailSub: [a.main ? '주캐' : '부캐', ...flags].join(' · '),
    mainChar: { name, rank_info: a.from_rank },
    subChar: { name, rank_info: a.to_rank },
    isMe: a.username === me,
  }
}

function period(board: EventBoard): string {
  const end = board.end_at ? formatEventTime(board.end_at) : '마감 미정'
  return `${formatEventTime(board.start_at)} ~ ${end}${board.ended ? ' (종료)' : ''}`
}

function Board({ board, me, onSelect }: { board: EventBoard; me: string | null; onSelect: (npid: string) => void }) {
  const rows = board.achievers.map((a) => achieverRow(a, me))
  const within = rows.slice(0, board.capacity)
  const beyond = rows.slice(board.capacity)
  return (
    <section className="event-section" aria-label="달성자 순위">
      <div className="event-section-head">
        <h4>달성자 순위</h4>
        <p className="event-count"><strong>{board.achievers.length}</strong> / {board.capacity}명</p>
      </div>
      <p className="event-note">
        {board.ended
          ? '이벤트가 끝났습니다. 이 순위는 잠정이며, 확정 결과는 공지를 확인해 주세요.'
          : '현재 계급 기준 잠정 순위입니다. 달성 후 떨어진 경우와 강등 수상자는 마감 후 확정합니다.'}
      </p>
      <RankList
        rows={within}
        label="달성자 순위"
        detailLabel="상승"
        charColumns={CHAR_COLUMNS}
        emptyMsg="아직 달성한 사람이 없습니다"
        onSelect={onSelect}
      />
      {beyond.length > 0 && (
        <>
          <p className="event-cutline">{board.capacity}위 밖</p>
          <RankList rows={beyond} label="순위 밖 달성자" detailLabel="상승" charColumns={CHAR_COLUMNS} onSelect={onSelect} />
        </>
      )}
    </section>
  )
}

export default function EventPage() {
  const { data, loading, refreshing, error, refresh } = useEvent()
  const me = useAuth().user?.username ?? null
  // A name picked here wins over the account, or the board could not show anyone else.
  const [picked, setPicked] = useState<string | null>(null)

  const status = statusBody(loading, error, {
    loadingMsg: '이벤트를 불러오는 중',
    onRetry: refresh,
    skeleton: <TableSkeleton rows={6} columns={5} label="이벤트를 불러오는 중" />,
  })

  return (
    <div className="panel">
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Gift size={15} aria-hidden="true" /></span>
          <div>
            <h3>데스활성화 이벤트</h3>
            {data && <p>{period(data)}</p>}
          </div>
        </div>
        <button className="refresh-btn" aria-label="새로고침" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>
      {status ?? (data && (
        <div className="event-page">
          <EventProgress npid={picked ?? me} onSearch={setPicked} />
          <Board board={data} me={me} onSelect={setPicked} />
          <EventRules />
        </div>
      ))}
    </div>
  )
}
