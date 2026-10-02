import { useEffect, useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import SaveCharTable, { SaveRank } from '@/shared/components/SaveCharTable'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import { isUsed, type PlayerSave } from '@/shared/saveChars'
import { AppError } from '@/shared/util/AppError'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import { RANK_ORDER } from '@/reservation/reservationLabels'

type State =
  | { kind: 'loading' }
  | { kind: 'loaded', save: PlayerSave }
  // never saved TTT2, or no such RPCN account: nothing to show either way
  | { kind: 'missing' }
  | { kind: 'failed' }

/** A player's TTT2 save on their profile: the account rank, the record, and
 * every character they have used, highest rank first. Read-only, and up to ten
 * minutes behind the game (the backend caches it).
 *
 * It loads on its own, apart from the play history above it: a save server
 * that is down costs this section, not the panel. */
export default function PlayerSaveSection({ npid }: { npid: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    fetchPlayerSave(npid)
      .then((save) => { if (!cancelled) setState({ kind: 'loaded', save }) })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({ kind: error instanceof AppError && error.status === 404 ? 'missing' : 'failed' })
      })
    return () => { cancelled = true }
  }, [npid])

  return (
    <section className="history-section history-save" aria-label="캐릭터별 계급">
      <div className="history-section-heading">
        <div><Gamepad2 size={17} aria-hidden="true" /><h3>캐릭터별 계급</h3></div>
        {state.kind === 'loaded' && <span>{formatTimeAgo(state.save.saved_at)} 저장</span>}
      </div>
      <SaveBody state={state} />
    </section>
  )
}

function SaveBody({ state }: { state: State }) {
  switch (state.kind) {
    case 'loading':
      return <p className="history-empty" role="status">세이브를 불러오는 중입니다.</p>
    case 'missing':
      return <p className="history-empty">캐릭터 계급 정보가 없습니다.</p>
    case 'failed':
      return <p className="history-empty" role="alert">세이브를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>
    case 'loaded':
      return <LoadedSave save={state.save} />
  }
}

function LoadedSave({ save }: { save: PlayerSave }) {
  const used = save.chars.filter(isUsed)
  return (
    <>
      <div className="history-save-summary">
        <span className="history-save-label">계정 계급</span>
        <SaveRank name={RANK_ORDER[save.account_rank] ?? `계급 ${save.account_rank}`} />
        <span className="history-save-record">{save.total}판 {save.wins}승 {save.losses}패</span>
      </div>
      {used.length > 0
        ? <SaveCharTable chars={used} />
        : <p className="history-empty">계급이 있거나 대전한 캐릭터가 없습니다.</p>}
    </>
  )
}
