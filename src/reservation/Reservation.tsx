import { useMemo, useState } from 'react'
import RankImage from '@/shared/components/RankImage'

type MatchType = '랭크매치' | '플레이어 매치'
type ReservationStatus = 'open' | 'full'

type Reservation = {
  id: number
  time: string
  duration: string
  host: string
  ranks: string[]
  type: MatchType
  capacity: number
  joined: number
  memo: string
  status: ReservationStatus
  contact?: string
}

const initialReservations: Reservation[] = [
  { id: 1, time: '19:00', duration: '약 2시간', host: 'MardukFan', ranks: ['Brawler', 'Vanquisher'], type: '랭크매치', capacity: 1, joined: 1, memo: '랭크매치 한 시간 이상 하실 분을 찾습니다.', status: 'full', contact: '성사! 오픈톡: tag2now / 방 비밀번호: 1900' },
  { id: 2, time: '19:00', duration: '약 1시간', host: 'GreenTiger', ranks: ['Warrior'], type: '랭크매치', capacity: 1, joined: 0, memo: '비슷한 계급에서 랭크매치 하실 분 찾아요.', status: 'open' },
  { id: 3, time: '19:00', duration: '약 2시간', host: 'JinPark', ranks: [], type: '플레이어 매치', capacity: 3, joined: 2, memo: '방 파고 순서대로 친선전 합니다. 초보도 환영!', status: 'open' },
  { id: 4, time: '20:00', duration: '약 1시간', host: 'BlueStorm', ranks: ['Yaksa'], type: '랭크매치', capacity: 1, joined: 1, memo: '랭크매치 한 시간 집중해서 해요.', status: 'full', contact: '성사! 오픈톡: tag2now / 방 비밀번호: 2030' },
  { id: 5, time: '20:00', duration: '약 2시간', host: 'LiliLove', ranks: ['Fighter', 'Brawler'], type: '랭크매치', capacity: 1, joined: 0, memo: '부담 없이 랭크매치 하실 분을 찾아요.', status: 'open' },
  { id: 6, time: '20:00', duration: '약 1시간', host: 'Six_miri', ranks: ['Vanquisher'], type: '랭크매치', capacity: 1, joined: 0, memo: '가볍게 랭크매치 1시간 하실 분. 승패 부담 없이!', status: 'open' },
  { id: 7, time: '21:30', duration: '약 2시간', host: 'Jewel_Gayageum', ranks: [], type: '플레이어 매치', capacity: 3, joined: 2, memo: '방 파고 순서대로 친선전 합니다. 초보도 환영!', status: 'open' },
  { id: 8, time: '21:30', duration: '약 1시간', host: 'OrangePunch', ranks: ['Fighter', 'Vanquisher'], type: '랭크매치', capacity: 1, joined: 1, memo: '오늘 마지막 랭크매치 한 판 더 하실 분.', status: 'full', contact: '성사! 오픈톡: tag2now / 방 비밀번호: 2130' },
  { id: 9, time: '21:30', duration: '약 1시간', host: 'TagMaster', ranks: ['Brawler', 'Yaksa'], type: '랭크매치', capacity: 1, joined: 0, memo: '늦은 시간 랭크매치 하실 분을 찾습니다.', status: 'open' },
  { id: 10, time: '22:00', duration: '약 1시간', host: 'NightOwl', ranks: ['Yaksa'], type: '랭크매치', capacity: 1, joined: 0, memo: '늦은 시간까지 랭크매치 가능하신 분.', status: 'open' },
]

const matchTypes: Array<MatchType | '전체'> = ['전체', '랭크매치', '플레이어 매치']
const rankOptions = ['Warrior', 'Fighter', 'Brawler', 'Vanquisher', 'Destroyer', 'Yaksa']

function availabilityMeta(reservation: Reservation) {
  if (reservation.status === 'full') return { label: '마감', className: 'border-secondary text-secondary bg-secondary/10' }
  if (reservation.type === '랭크매치') return { label: '모집중', className: 'border-primary text-primary bg-primary/10' }
  return { label: `${reservation.joined}/${reservation.capacity}명`, className: 'border-primary text-primary bg-primary/10' }
}

export default function Reservation() {
  const [typeFilter, setTypeFilter] = useState<MatchType | '전체'>('전체')
  const [rankFilter, setRankFilter] = useState('전체')
  const [reservations, setReservations] = useState(initialReservations)
  const [joinedIds, setJoinedIds] = useState<number[]>([])
  const [selectedId, setSelectedId] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ time: '21:00', type: '랭크매치' as MatchType, ranks: ['Vanquisher'], capacity: '1', memo: '' })

  const visibleReservations = useMemo(
    () => reservations.filter((reservation) =>
      (typeFilter === '전체' || reservation.type === typeFilter)
      && (rankFilter === '전체' || reservation.ranks.includes(rankFilter)),
    ),
    [rankFilter, reservations, typeFilter],
  )
  const selectedReservation = visibleReservations.find((reservation) => reservation.id === selectedId) ?? visibleReservations[0]
  const reservationsByTime = useMemo(() => Object.entries(visibleReservations.reduce<Record<string, Reservation[]>>((groups, reservation) => {
    ;(groups[reservation.time] ??= []).push(reservation)
    return groups
  }, {})), [visibleReservations])

  const handleJoin = (id: number) => {
    const alreadyJoined = joinedIds.includes(id)
    const current = reservations.find((reservation) => reservation.id === id)
    if (!current) return

    if (alreadyJoined) {
      setJoinedIds((ids) => ids.filter((joinedId) => joinedId !== id))
      setReservations((items) => items.map((item) => item.id === id
        ? { ...item, joined: item.joined - 1, status: 'open', contact: undefined }
        : item))
      setNotice('참가를 취소했습니다. 다시 모집중으로 전환되었습니다.')
      return
    }

    if (current.status === 'full') return
    const nextJoined = current.joined + 1
    const becameFull = nextJoined === current.capacity
    setJoinedIds((ids) => [...ids, id])
    setReservations((items) => items.map((item) => item.id === id
      ? {
          ...item,
          joined: nextJoined,
          status: becameFull ? 'full' : 'open',
          contact: becameFull ? '성사! 오픈톡: tag2now / 방 비밀번호: 2121' : item.contact,
        }
      : item))
    setNotice(becameFull ? '매칭이 성사되었습니다. 접속 정보를 확인하세요!' : '참가했습니다. 다른 참가자를 기다리고 있어요.')
  }

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()
    const newReservation: Reservation = {
      id: Date.now(),
      time: form.time,
      duration: '약 1시간',
      host: '나',
      ranks: form.type === '플레이어 매치' ? [] : form.ranks,
      type: form.type,
      capacity: form.type === '랭크매치' ? 1 : Number(form.capacity),
      joined: 0,
      memo: form.memo || '함께 하실 분을 찾고 있어요.',
      status: 'open',
    }
    setReservations((items) => [...items, newReservation].sort((a, b) => a.time.localeCompare(b.time)))
    setShowForm(false)
    setNotice('예약을 만들었습니다. 참여자를 기다려 보세요!')
    setForm({ time: '21:00', type: '랭크매치', ranks: ['Vanquisher'], capacity: '1', memo: '' })
  }

  return (
    <section className="panel relative overflow-hidden" aria-label="예약">
      <div className="absolute inset-0 pointer-events-none opacity-30 [background-image:linear-gradient(rgba(0,200,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,200,212,0.04)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-border-light pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="panel-meta mb-1 text-primary">MATCH APPOINTMENT / KST</p>
            <h2 className="font-display text-lg tracking-[0.08em] text-white">오늘의 예약</h2>
            <p className="mt-1 text-sm text-txt-dim">미리 약속하고, 접속 시간을 맞춰 보세요.</p>
          </div>
          <button className="btn-primary self-start sm:self-auto" type="button" onClick={() => setShowForm((value) => !value)}>
            {showForm ? '닫기' : '+ 예약 만들기'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-4 grid gap-3 border border-primary-dim bg-bg-row/90 p-4 shadow-[0_0_28px_rgba(0,200,212,0.08)] sm:grid-cols-2">
            <p className="col-span-full panel-meta mb-0 text-primary">NEW MATCH REQUEST</p>
            <label className="text-sm font-bold text-txt-dim">시작 시각
              <input className="input-base mt-1 block w-full px-3 py-2" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
            </label>
            <label className="text-sm font-bold text-txt-dim">매치 종류
              <select className="input-base mt-1 block w-full px-3 py-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MatchType })}>
                {matchTypes.slice(1).map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            {form.type !== '플레이어 매치' && <label className="text-sm font-bold text-txt-dim">보유 계급 <span className="font-normal">(복수 선택 가능)</span>
              <select className="input-base mt-1 block h-24 w-full px-3 py-2" multiple value={form.ranks} onChange={(event) => setForm({ ...form, ranks: Array.from(event.target.selectedOptions, (option) => option.value) })} required>
                {rankOptions.map((rank) => <option key={rank}>{rank}</option>)}
              </select>
            </label>}
            {form.type !== '랭크매치' && <label className="text-sm font-bold text-txt-dim">모집 인원
              <select className="input-base mt-1 block w-full px-3 py-2" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })}>
                <option value="1">1명</option><option value="2">2명</option><option value="3">3명</option>
              </select>
            </label>}
            <label className="text-sm font-bold text-txt-dim">메모 <span className="font-normal">(선택)</span>
              <input className="input-base mt-1 block w-full px-3 py-2" maxLength={140} placeholder="예: 부담 없이 1시간 랭매" value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
            </label>
            <div className="col-span-full flex justify-end gap-2 pt-1"><button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>취소</button><button className="btn-primary" type="submit">예약 등록</button></div>
          </form>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-b border-border pb-4">
            <select aria-label="매치 종류 필터" className="input-base px-2 py-1 text-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as MatchType | '전체')}>
              {matchTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
            <select aria-label="계급 필터" className="input-base px-2 py-1 text-sm" value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
              <option>전체</option>{rankOptions.map((rank) => <option key={rank}>{rank}</option>)}
            </select>
        </div>

        {notice && <p role="status" className="mt-3 border-l-2 border-primary bg-primary/8 px-3 py-2 text-sm font-semibold text-primary">{notice}</p>}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
          <div className="overflow-x-auto border border-border-light bg-bg-row/70">
            <div className="min-w-150">
            <div className="grid grid-cols-[4.5rem_minmax(7rem,1fr)_minmax(14rem,1.5fr)_5.5rem] gap-2 border-b border-border-light bg-bg-panel px-3 py-2 text-[0.68rem] font-bold tracking-[0.12em] text-txt-dim">
              <span>시간</span><span>등록자</span><span>매치</span><span className="text-center">현황</span>
            </div>
            {visibleReservations.map((reservation) => {
              const availability = availabilityMeta(reservation)
              const selected = reservation.id === selectedReservation?.id
              return <button key={reservation.id} type="button" onClick={() => setSelectedId(reservation.id)} className={`grid w-full min-w-150 grid-cols-[4.5rem_minmax(7rem,1fr)_minmax(14rem,1.5fr)_5.5rem] gap-2 border-b border-border px-3 py-2 text-left transition-colors ${selected ? 'bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]' : 'hover:bg-primary-hover'}`}>
                <span className="font-display text-base font-black tracking-[0.06em] text-white">{reservation.time}</span>
                <span className="self-center truncate text-sm font-bold text-txt">{reservation.host}</span>
                <span className="flex h-7 items-center gap-2 self-center">{reservation.type === '플레이어 매치' && <span className="border border-primary-dim px-1.5 py-0.5 text-xs font-bold text-primary">플레이어 매치</span>}{reservation.ranks.map((rank) => <RankImage key={rank} rankInfo={{ name: rank, tier: rank }} className="h-7 w-auto" />)}</span>
                <span className={`self-center justify-self-center border px-1.5 py-0.5 text-[0.65rem] font-bold tracking-[0.08em] ${availability.className}`}>{availability.label}</span>
              </button>
            })}
            </div>
          </div>
          {selectedReservation && (() => {
            const availability = availabilityMeta(selectedReservation)
            const joined = joinedIds.includes(selectedReservation.id)
            return <aside className={`border bg-bg-row p-4 ${selectedReservation.status === 'full' ? 'border-secondary/60' : 'border-primary-dim'}`} aria-label="선택한 예약 상세">
              <div className="flex items-start justify-between gap-3"><div><p className="panel-meta mb-1">선택한 예약</p><p className="font-display text-3xl font-black text-white">{selectedReservation.time}</p></div><span className={`border px-2 py-1 text-xs font-bold tracking-[0.12em] ${availability.className}`}>{availability.label}</span></div>
              <div className="mt-4 space-y-3 border-y border-border py-4 text-sm"><p className="flex items-center justify-between"><span className="text-txt-dim">예약자</span><strong className="text-txt">{selectedReservation.host}</strong></p>{selectedReservation.type !== '플레이어 매치' && <div className="flex items-center justify-between"><span className="text-txt-dim">보유 계급</span><span className="flex h-8 items-center gap-1">{selectedReservation.ranks.map((rank) => <RankImage key={rank} rankInfo={{ name: rank, tier: rank }} className="h-8 w-auto" />)}</span></div>}<p className="flex items-center justify-between"><span className="text-txt-dim">종류</span><strong className="text-primary">{selectedReservation.type}</strong></p><p className="flex items-center justify-between"><span className="text-txt-dim">예상 시간</span><strong className="text-txt">{selectedReservation.duration}</strong></p></div>
              <p className="mt-4 min-h-10 text-sm text-txt-dim">{selectedReservation.memo}</p>
              {selectedReservation.status === 'full' && selectedReservation.contact && <p className="mt-4 border border-secondary/50 bg-secondary/8 px-3 py-2 text-sm font-bold text-secondary-light">{selectedReservation.contact}</p>}
              <button type="button" className={`mt-4 w-full py-2 text-sm font-bold transition-colors ${joined ? 'border border-primary text-primary hover:bg-primary/10' : selectedReservation.status === 'full' ? 'cursor-not-allowed border border-border bg-bg-panel text-txt-dim' : 'bg-primary text-white hover:bg-primary/85'}`} disabled={selectedReservation.status === 'full' && !joined} onClick={() => handleJoin(selectedReservation.id)}>{joined ? '참가 취소' : selectedReservation.status === 'full' ? '모집 마감' : '참가하기'}</button>
            </aside>
          })()}
        </div>
        {visibleReservations.length === 0 && <div className="py-16 text-center"><p className="font-display text-lg text-txt">아직 예약이 없습니다</p><p className="mt-2 text-sm text-txt-dim">원하는 시간에 먼저 예약을 만들어 보세요.</p></div>}
        <p className="mt-5 text-center text-xs text-txt-dim">프로토타입 · 실제 예약 정보는 저장되지 않습니다.</p>
      </div>
    </section>
  )
}
