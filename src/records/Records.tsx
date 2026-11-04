import { useState } from 'react'
import { RefreshCw, Swords } from 'lucide-react'
import LoadingBar from '@/shared/components/LoadingBar'
import MatchRecordRow from '@/shared/components/MatchRecordRow'
import RecordMoreButton from '@/shared/components/RecordMoreButton'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import { ListSkeleton } from '@/shared/components/Skeleton'
import { statusBody } from '@/shared/util/panelStatus'
import type { LeaderboardEntry } from '@/shared/types'
import useMatchRecords from '@/records/useMatchRecords'

interface RecordsProps {
  leaderboardEntries?: LeaderboardEntry[]
}

/** Everyone's recorded rank matches, newest first, searchable by name. Fetched
 * once and refreshed by hand, as the leaderboards are. */
export default function Records({ leaderboardEntries }: RecordsProps) {
  const [query, setQuery] = useState('')
  const { searched, pages } = useMatchRecords(query)
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)

  const status = statusBody(pages.loading && pages.matches.length === 0, pages.error, {
    loadingMsg: '전적을 불러오는 중',
    onRetry: pages.refresh,
    skeleton: <ListSkeleton rows={8} label="전적을 불러오는 중" />,
  })

  return (
    <div className="panel relative" aria-live="polite">
      <LoadingBar visible={pages.loading && pages.matches.length > 0} />
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Swords size={15} aria-hidden="true" /></span>
          <div>
            <h3>전체 전적</h3>
            <p>랭크 매치 · 최신순</p>
          </div>
        </div>
        <button className="refresh-btn" aria-label="새로고침" onClick={pages.refresh} disabled={pages.loading}>
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Outside the status, so typing keeps the field and its focus while the list reloads. */}
      <div className="records-search">
        <label className="sr-only" htmlFor="records-search">플레이어 검색</label>
        <input
          id="records-search"
          type="search"
          className="input-base"
          placeholder="플레이어 이름 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {status ?? (
        <>
          {pages.matches.length > 0 ? (
            <ol className="record-list" aria-label="전체 전적">
              {pages.matches.map((record) => (
                <MatchRecordRow key={record.id} record={record} onOpen={setSelectedNpid} />
              ))}
            </ol>
          ) : (
            <p className="state-msg px-4">{searched ? `'${searched}'의 전적이 없습니다` : '기록된 판이 아직 없습니다'}</p>
          )}
          <RecordMoreButton pages={pages} />
        </>
      )}

      {selectedNpid && (
        <PlayerHistoryPanel
          npid={selectedNpid}
          leaderboardEntry={leaderboardEntries?.find((e) => e.np_id === selectedNpid)}
          leaderboardEntries={leaderboardEntries}
          onClose={() => setSelectedNpid(null)}
        />
      )}
    </div>
  )
}
