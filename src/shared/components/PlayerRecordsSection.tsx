import { useCallback, useEffect, useState } from 'react'
import { Swords } from 'lucide-react'
import MatchRecordRow from '@/shared/components/MatchRecordRow'
import RecordMoreButton from '@/shared/components/RecordMoreButton'
import useRecordPages from '@/shared/hooks/useRecordPages'
import { fetchMatchRecords } from '@/shared/matchRecordsApi'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import type { PlayerSave } from '@/shared/saveChars'

/** A player's rank matches on their profile, newest first, each with the
 * opponent and both players' characters. The totals above them are the save's
 * lifetime record, so they count matches from before tag2now recorded any. */
export default function PlayerRecordsSection({ npid, onOpen }: { npid: string; onOpen: (npid: string) => void }) {
  const fetchPage = useCallback((before: number | null) => fetchMatchRecords({ npid }, before), [npid])
  const pages = useRecordPages(fetchPage)
  const save = useLifetimeRecord(npid)

  return (
    <section className="history-section history-records" aria-label="전적">
      <div className="history-section-heading">
        <div><Swords size={17} aria-hidden="true" /><h3>랭크 매치 전적</h3></div>
        <span>최신순</span>
      </div>

      {save && (
        <p className="history-save-summary">
          <span className="history-save-label">통산</span>
          <span className="history-save-record">{save.total}판 {save.wins}승 {save.losses}패</span>
        </p>
      )}

      {pages.loading && <p className="history-empty" role="status">전적을 불러오는 중입니다.</p>}
      {!pages.loading && pages.error && <p className="history-empty" role="alert">전적을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>}
      {!pages.loading && !pages.error && (
        <>
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

/** The save's record, or null while it loads and when there is none or it fails:
 * the totals are a heading over the list, not worth an error of their own. */
function useLifetimeRecord(npid: string): PlayerSave | null {
  const [save, setSave] = useState<PlayerSave | null>(null)
  useEffect(() => {
    let cancelled = false
    setSave(null)
    fetchPlayerSave(npid)
      .then((found) => { if (!cancelled) setSave(found) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [npid])
  return save
}
