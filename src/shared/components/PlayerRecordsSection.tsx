import { useCallback } from 'react'
import { Swords } from 'lucide-react'
import MatchRecordRow from '@/shared/components/MatchRecordRow'
import RecordMoreButton from '@/shared/components/RecordMoreButton'
import useRecordPages from '@/shared/hooks/useRecordPages'
import { fetchPlayerRecords } from '@/shared/matchRecordsApi'

/** A player's rank matches on their profile, newest first, each with the
 * opponent and both sides' characters. Only matches tag2now recorded count, so
 * the totals are not the save's lifetime record on the next tab. */
export default function PlayerRecordsSection({ npid, onOpen }: { npid: string; onOpen: (npid: string) => void }) {
  const fetchPage = useCallback((before: number | null) => fetchPlayerRecords(npid, before), [npid])
  const pages = useRecordPages(fetchPage)
  const totals = pages.first

  return (
    <section className="history-section history-records" aria-label="전적">
      <div className="history-section-heading">
        <div><Swords size={17} aria-hidden="true" /><h3>랭크 매치 전적</h3></div>
        <span>tag2now 기록</span>
      </div>

      {pages.loading && <p className="history-empty" role="status">전적을 불러오는 중입니다.</p>}
      {!pages.loading && pages.error && <p className="history-empty" role="alert">전적을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>}
      {!pages.loading && !pages.error && totals && (
        <>
          <p className="history-save-summary">
            <span className="history-save-record">{totals.wins + totals.losses}판 {totals.wins}승 {totals.losses}패</span>
          </p>
          {pages.matches.length > 0 ? (
            <ol className="record-list" aria-label={`${npid}의 전적`}>
              {pages.matches.map((record) => (
                <MatchRecordRow key={record.id} record={record} viewer={npid} onOpen={onOpen} />
              ))}
            </ol>
          ) : <p className="history-empty">기록된 랭크 매치가 아직 없습니다.</p>}
          <RecordMoreButton pages={pages} />
        </>
      )}
    </section>
  )
}
