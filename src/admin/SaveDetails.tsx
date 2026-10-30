import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import SaveCharTable from '@/shared/components/SaveCharTable'
import { RankCode } from '@/shared/components/RankField'
import { isUsed } from '@/shared/saveChars'
import { formatInstant } from '@/admin/adminText'
import type { SaveAuditRecord, SaveBackup, SaveChar, SaveInfo } from '@/admin/types'

function onlineText(online: boolean | null): string {
  if (online === null) return '확인할 수 없음'
  return online ? '접속 중 (수정할 수 없음)' : '오프라인'
}

export function SaveSummary({ save }: { save: SaveInfo }) {
  return (
    <section className="admin-account" aria-label="조회한 세이브">
      <h3>{save.username} <small>data_id {save.data_id}</small></h3>
      <dl>
        <dt>계정 계급</dt><dd className="save-inline"><RankCode code={save.account_rank} /> {save.progress}/11</dd>
        <dt>전적</dt><dd>{save.total}판 {save.wins}승 {save.losses}패</dd>
        <dt>마지막 저장</dt><dd>{formatInstant(save.saved_at)}</dd>
        <dt>RPCS3 접속</dt><dd className={save.online ? 'is-banned' : undefined}>{onlineText(save.online)}</dd>
        <dt>체크섬</dt><dd className={save.checksum_ok ? undefined : 'is-banned'}>{save.checksum_ok ? '정상' : '불일치'}</dd>
      </dl>
    </section>
  )
}

export function SaveCharacters({ chars }: { chars: SaveChar[] }) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? chars : chars.filter(isUsed)

  return (
    <section className="save-section" aria-label="캐릭터 목록">
      <div className="save-section-head">
        <h3>캐릭터</h3>
        <label className="save-check">
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          전체 {chars.length}칸 보기
        </label>
      </div>
      {shown.length === 0
        ? <p className="admin-notice">계급이 있거나 대전한 캐릭터가 없습니다.</p>
        : (
          <SaveCharTable chars={shown} />
        )}
    </section>
  )
}

export function BackupList({ backups, busy, onRestore }: {
  backups: SaveBackup[]
  busy: boolean
  onRestore: (label: string) => void
}) {
  // Labels are timestamps or names given on the command line; newest first
  // reads best for the automatic ones, which are most of them.
  const newestFirst = [...backups].reverse()

  return (
    <section className="save-section" aria-label="백업">
      <h3>백업 <small>{backups.length}개</small></h3>
      {newestFirst.length === 0
        ? <p className="admin-notice">백업이 없습니다. 수정할 때마다 하나씩 생깁니다.</p>
        : (
          <ul className="save-backups">
            {newestFirst.map((backup) => (
              <li key={backup.label}>
                <span className="save-backup-label">{backup.label}</span>
                <span className="save-backup-meta save-inline">
                  {backup.total === null
                    ? '크기가 맞지 않는 파일'
                    : <>{backup.total}판 · 계정 <RankCode code={backup.account_rank ?? 0} /></>}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onRestore(backup.label)}
                  disabled={busy || backup.total === null}
                  aria-label={`${backup.label} 복원 미리보기`}
                >
                  <RotateCcw size={14} aria-hidden="true" /> 복원 미리보기
                </button>
              </li>
            ))}
          </ul>
        )}
    </section>
  )
}

// Integrity fields every write records; they say nothing an admin acts on.
const QUIET_DETAILS = new Set(['data_id', 'md5_before', 'md5_after', 'checksum', 'verified'])

const detailText = (details: Record<string, unknown>) =>
  Object.entries(details)
    .filter(([key, value]) => !QUIET_DETAILS.has(key) && value !== null)
    .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' ')

export function AuditLog({ records }: { records: SaveAuditRecord[] }) {
  return (
    <section className="save-section" aria-label="수정 기록">
      <h3>수정 기록 <small>최근 {records.length}건</small></h3>
      {records.length === 0
        ? <p className="admin-notice">기록이 없습니다.</p>
        : (
          <div className="save-table-wrap">
            <table className="save-table">
              <thead><tr><th scope="col">시각</th><th scope="col">누가</th><th scope="col">작업</th><th scope="col">내용</th></tr></thead>
              <tbody>
                {[...records].reverse().map((record, index) => (
                  <tr key={`${record.ts}-${index}`}>
                    <td>{record.ts.replace('T', ' ')}</td>
                    <td>{record.user}</td>
                    <td>{record.action}</td>
                    <td className="save-detail">{detailText(record.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  )
}
