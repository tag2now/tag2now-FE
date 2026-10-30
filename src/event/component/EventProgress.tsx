import { useEffect, useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import RankImage from '@/shared/components/RankImage'
import { charImageUrl } from '@/shared/characterImage'
import { fetchEventPlayer } from '@/event/useEvent'
import type { EventPlayer, EventSlot } from '@/event/types'

function slotStatus(slot: EventSlot): string {
  if (slot.achieved) return '달성'
  const left = slot.target.rank - slot.rank.rank
  return left > 0 ? `${left}계급 남음` : '게임 기록 없음'
}

function SlotRow({ slot }: { slot: EventSlot }) {
  const name = slot.char.character
  const url = charImageUrl(name)
  return (
    <tr>
      <td>
        <span className="event-char">
          {url && <img src={url} alt="" className="char-art mini-char-portrait" loading="lazy" />}
          <span>{name}</span>
          {slot.main && <span className="event-tag">주캐</span>}
        </span>
      </td>
      <td><RankImage rankInfo={slot.start} className="mini-char-rank" /></td>
      <td><RankImage rankInfo={slot.target} className="mini-char-rank" /></td>
      <td><RankImage rankInfo={slot.rank} className="mini-char-rank" /></td>
      <td className={slot.achieved ? 'event-done' : undefined}>{slotStatus(slot)}</td>
    </tr>
  )
}

function Summary({ player }: { player: EventPlayer }) {
  const fell = player.top_rank.rank !== player.best_rank.rank
  return (
    <dl className="event-summary">
      <div><dt>시작 최고계급</dt><dd>{player.top_rank.name}</dd></div>
      <div><dt>역대 최고계급</dt><dd>{player.best_rank.name}</dd></div>
      <div>
        <dt>주캐 조건</dt>
        <dd>+{player.main_steps}계급{fell && ' (역대와 달라 +1 포함)'}</dd>
      </div>
      <div>
        <dt>부캐 조건</dt>
        <dd>+{player.sub_steps}계급, {player.sub_floor.name}부터</dd>
      </div>
      <div>
        <dt>현재 순위</dt>
        <dd>{player.place ? `${player.place}위` : '미달성'}</dd>
      </div>
    </dl>
  )
}

/** Searches any player; opens on whoever is picked from the board, or the
 * signed-in account, because "how far am I" is what most readers came for. */
export default function EventProgress({ npid, onSearch }: { npid: string | null; onSearch: (npid: string) => void }) {
  const [query, setQuery] = useState('')
  const [player, setPlayer] = useState<EventPlayer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!npid) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchEventPlayer(npid)
      .then((found) => {
        if (cancelled) return
        setPlayer(found)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setPlayer(null)
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [npid])

  const search = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  return (
    <section className="event-section" aria-label="진행 현황">
      <div className="event-section-head">
        <h4>{player && !error ? `${player.username}의 진행 현황` : '진행 현황'}</h4>
        <form className="event-search" role="search" onSubmit={search}>
          <input
            className="input-base"
            aria-label="RPCN 아이디"
            placeholder="RPCN 아이디 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="refresh-btn" aria-label="조회"><Search size={14} aria-hidden="true" /></button>
        </form>
      </div>
      {!npid && <p className="state-msg">로그인하거나 아이디를 검색하면 시작 계급과 목표를 볼 수 있습니다.</p>}
      {loading && <p className="state-msg">불러오는 중</p>}
      {error && <p className="state-msg error">{error}</p>}
      {player && !loading && !error && (
        <>
          <Summary player={player} />
          <div className="event-table-wrap">
            <table className="event-table">
              <thead>
                <tr><th scope="col">캐릭터</th><th scope="col">시작</th><th scope="col">목표</th><th scope="col">현재</th><th scope="col">상태</th></tr>
              </thead>
              <tbody>
                {player.slots.map((slot) => <SlotRow key={slot.char.id} slot={slot} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
