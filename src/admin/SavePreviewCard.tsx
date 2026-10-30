import { SavePortrait as Portrait, SaveRank as Rank } from '@/shared/components/SaveCharTable'
import { RankCode } from '@/shared/components/RankField'
import { signed } from '@/shared/saveChars'
import { faceOfSlot } from '@/admin/adminText'
import type { SaveChar, SaveEdit, SavePreview, SaveWriteResult, SlotState } from '@/admin/types'

/** What is being changed: who, then the rank they go to. */
function EditTarget({ edit, chars }: { edit: SaveEdit, chars: SaveChar[] }) {
  switch (edit.action) {
    case 'set-rank':
      return edit.char === 'all'
        ? <>전체 캐릭터 → <RankCode code={edit.rank} /></>
        : <><Portrait name={faceOfSlot(edit.char, chars)} /> → <RankCode code={edit.rank} /></>
    case 'set-account-rank':
      return <>계정 계급 → <RankCode code={edit.rank} /></>
    case 'floor':
      return edit.rank === undefined ? <>floor (자동)</> : <>floor → <RankCode code={edit.rank} /></>
    case 'restore':
      return <>{edit.label} 백업으로 복원</>
  }
}

function Slot({ slot }: { slot: SlotState }) {
  return <span className="save-inline"><Rank name={slot.rank_name} /> {slot.points}점 · {signed(slot.streak)}</span>
}

/** Why the server would refuse this write, so the button is not offered for it. */
function blocker(answer: SaveWriteResult): string | null {
  if (answer.online) return '게임에 접속 중인 계정은 수정할 수 없습니다. 접속을 끊은 뒤 다시 미리보기 하세요.'
  if (answer.floor?.likely_demoted) return '이전 floor 뒤에 강등된 캐릭터로 보입니다. 그래도 올리려면 "강등으로 보이는 캐릭터도 올리기"를 선택하세요.'
  return null
}

export default function SavePreviewCard({ preview: { edit, answer }, chars, busy, onApply, onDiscard }: {
  preview: SavePreview
  chars: SaveChar[]
  busy: boolean
  onApply: () => void
  onDiscard: () => void
}) {
  const { changes } = answer
  const nothing = !changes.account_rank && changes.chars.length === 0
  const refused = blocker(answer)

  return (
    <section className="save-section save-preview" aria-label="미리보기">
      <h3>미리보기 <small className="save-inline"><EditTarget edit={edit} chars={chars} /></small></h3>
      {answer.floor && (
        <p className="admin-notice save-inline">
          도달 <RankCode code={answer.floor.reached} /> → floor <RankCode code={answer.floor.floor} />, {answer.floor.raised}칸 올림
          {answer.floor.points_fixed > 0 && `, ${answer.floor.points_fixed}칸 점수 보정`}
        </p>
      )}
      {answer.online === null && <p className="save-warning">접속 여부를 확인하지 못했습니다. 적용하면 거부될 수 있습니다.</p>}
      {refused && <p className="save-warning">{refused}</p>}
      {nothing
        ? <p className="admin-notice">바뀌는 것이 없습니다.</p>
        : (
          <div className="save-table-wrap">
            <table className="save-table">
              <thead><tr><th scope="col">대상</th><th scope="col">지금</th><th scope="col">바뀐 뒤</th></tr></thead>
              <tbody>
                {changes.account_rank && (
                  <tr>
                    <td>계정 계급</td>
                    <td><RankCode code={changes.account_rank.before} /></td>
                    <td><RankCode code={changes.account_rank.after} /></td>
                  </tr>
                )}
                {changes.chars.map((change) => (
                  <tr key={change.id}>
                    <td><Portrait name={change.character} /></td>
                    <td><Slot slot={change.before} /></td>
                    <td><Slot slot={change.after} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <div className="save-actions">
        <button type="button" className="btn-danger" onClick={onApply} disabled={busy || nothing || refused !== null}>적용</button>
        <button type="button" className="btn-ghost" onClick={onDiscard} disabled={busy}>닫기</button>
      </div>
    </section>
  )
}
