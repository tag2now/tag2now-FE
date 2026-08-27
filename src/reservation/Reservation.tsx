import { useEffect, useMemo, useState } from 'react'
import { WheelPicker, WheelPickerWrapper, type WheelPickerOption } from '@ncdai/react-wheel-picker'
import '@ncdai/react-wheel-picker/style.css'
import RankImage from '@/shared/components/RankImage'
import { getUsername } from '@/shared/util/cookie'
import { cancelParticipation, createReservation, fetchReservations, hasParticipation, joinReservation, type ApiReservation } from './reservationApi'
import { CalendarPlus, Check, ChevronDown, Clock3, Filter, LogIn, UserMinus, X } from 'lucide-react'
import Select from '@/shared/components/Select'

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
const matchTypes: Array<MatchType | '전체'> = ['전체', '랭크매치', '플레이어 매치']
const durationOptions = [
  { value: '30', label: '약 30분' },
  { value: '60', label: '약 1시간' },
  { value: '120', label: '약 2시간' },
  { value: '180', label: '약 3시간' },
]
const durationLabels = new Map(durationOptions.map(({ value, label }) => [Number(value), label]))
const matchTypeLabels: Record<ApiReservation['match_type'], MatchType> = { rank_match: '랭크매치', player_match: '플레이어 매치' }
const matchTypeValues: Record<MatchType, ApiReservation['match_type']> = { '랭크매치': 'rank_match', '플레이어 매치': 'player_match' }
const kstTimeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })

function fromApi(item: ApiReservation): Reservation {
  return {
    id: item.id,
    time: kstTimeFormat.format(new Date(item.start_at)),
    duration: durationLabels.get(item.duration_minutes) ?? `약 ${item.duration_minutes}분`,
    host: item.host_display_name,
    ranks: item.host_ranks,
    type: matchTypeLabels[item.match_type],
    capacity: item.capacity,
    joined: item.participant_count,
    memo: item.memo,
    status: item.status === 'open' && item.participant_count < item.capacity ? 'open' : 'full',
  }
}
const rankOptions = [
  'Beginner', '9th kyu', '8th kyu', '7th kyu',
  '6th kyu', '5th kyu', '4th kyu', '3rd kyu',
  '2nd kyu', '1st kyu', '1st dan', '2nd dan',
  '3rd dan', 'Disciple', 'Mentor', 'Master',
  'Grand Master', 'Brawler', 'Marauder', 'Fighter',
  'Berserker', 'Warrior', 'Avenger', 'Duelist',
  'Pugilist', 'Vanquisher', 'Destroyer', 'Conqueror',
  'Savior', 'Genbu', 'Byakko', 'Seiryu',
  'Suzaku', 'Fujin', 'Raijin', 'Yaksa',
]
const rankOrder = new Map(rankOptions.map((rank, index) => [rank, index]))
const rankPickerOptions = Array.from(
  { length: Math.ceil(rankOptions.length / 4) },
  (_, rowIndex) => rankOptions.slice(rowIndex * 4, rowIndex * 4 + 4),
).reverse().flat()
const hourOptions: WheelPickerOption<string>[] = Array.from({ length: 24 }, (_, hour) => {
  const value = String(hour).padStart(2, '0')
  return { value, label: `${value}시` }
})
const minuteOptions: WheelPickerOption<string>[] = Array.from({ length: 60 }, (_, minute) => {
  const value = String(minute).padStart(2, '0')
  return { value, label: `${value}분` }
})

function sortSelectedRanks(ranks: string[]) {
  return [...ranks].sort((left, right) => (rankOrder.get(right) ?? -1) - (rankOrder.get(left) ?? -1))
}

function availabilityMeta(reservation: Reservation) {
  if (reservation.status === 'full') return { label: '마감', className: 'border-secondary text-secondary bg-secondary/10' }
  if (reservation.type === '랭크매치') return { label: '모집중', className: 'border-primary text-primary bg-primary/10' }
  return { label: `${reservation.joined}/${reservation.capacity}명`, className: 'border-primary text-primary bg-primary/10' }
}

function RankSummary({ ranks, imageClassName = 'h-8' }: { ranks: string[], imageClassName?: string }) {
  if (ranks.length === 0) return null
  const sortedRanks = sortSelectedRanks(ranks)
  return <span className="relative flex shrink-0 items-center justify-center" aria-label={sortedRanks.join(', ')}>
    <RankImage rankInfo={{ name: sortedRanks[0], tier: sortedRanks[0] }} className={`${imageClassName} w-auto object-contain`} />
    {ranks.length > 1 && <span aria-label={`추가 계급 ${ranks.length - 1}개`} className="absolute left-full ml-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-primary-dim bg-primary/10 px-1 text-xs font-black text-primary">+{ranks.length - 1}</span>}
  </span>
}

export default function Reservation() {
  const [typeFilter, setTypeFilter] = useState<MatchType | '전체'>('전체')
  const [rankFilter, setRankFilter] = useState('전체')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [joinedIds, setJoinedIds] = useState<number[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [rankPickerOpen, setRankPickerOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [draftTime, setDraftTime] = useState('21:00')
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' }>({ text: '', tone: 'info' })
  const showNotice = (text: string) => setNotice({ text, tone: 'info' })
  const showError = (error: unknown, fallback: string) => setNotice({ text: error instanceof Error ? error.message : fallback, tone: 'error' })
  const clearNotice = () => setNotice({ text: '', tone: 'info' })
  const [form, setForm] = useState({ time: '21:00', duration: '60', type: '랭크매치' as MatchType, ranks: ['Vanquisher'], capacity: '1', memo: '' })

  const refresh = async () => {
    try {
      const items = (await fetchReservations()).map(fromApi)
      setReservations(items)
      setJoinedIds(items.filter((item) => hasParticipation(item.id)).map((item) => item.id))
    } catch (error) { showError(error, '예약을 불러오지 못했습니다.') }
  }

  useEffect(() => {
    refresh().then()
    const id = window.setInterval(() => refresh().then(), 10_000)
    return () => window.clearInterval(id)
  }, [])

  const noticeBanner = notice.text && (
    <p
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={`border-l-2 px-3 py-2 text-sm font-semibold ${notice.tone === 'error' ? 'border-error bg-error/8 text-error' : 'border-primary bg-primary/8 text-primary'}`}
    >{notice.text}</p>
  )

  const closeForm = () => { setShowForm(false); setRankPickerOpen(false); setTimePickerOpen(false); clearNotice() }

  const toggleRank = (rank: string) => {
    setForm((current) => ({
      ...current,
      ranks: sortSelectedRanks(current.ranks.includes(rank)
        ? current.ranks.filter((selectedRank) => selectedRank !== rank)
        : [...current.ranks, rank]),
    }))
  }

  const visibleReservations = useMemo(
    () => reservations.filter((reservation) =>
      (typeFilter === '전체' || reservation.type === typeFilter)
      && (rankFilter === '전체' || reservation.ranks.includes(rankFilter)),
    ),
    [rankFilter, reservations, typeFilter],
  )
  const selectedReservation = visibleReservations.find((reservation) => reservation.id === selectedId) ?? visibleReservations[0]
  const reservationsByTime = useMemo(() => {
    const groups = visibleReservations.reduce<Record<string, Reservation[]>>((result, reservation) => {
      ;(result[reservation.time] ??= []).push(reservation)
      return result
    }, {})
    return Object.entries(groups)
      .sort(([leftTime], [rightTime]) => leftTime.localeCompare(rightTime))
      .map(([time, items]) => [time, [...items].sort((left, right) => Number(left.status === 'full') - Number(right.status === 'full'))] as const)
  }, [visibleReservations])

  const handleJoin = async (id: number) => {
    const alreadyJoined = joinedIds.includes(id)
    const current = reservations.find((reservation) => reservation.id === id)
    if (!current) return

    if (alreadyJoined) {
      try { await cancelParticipation(id); await refresh(); showNotice('참가를 취소했습니다. 다시 모집중으로 전환되었습니다.') } catch (error) { showError(error, '참가 취소에 실패했습니다.') }
      return
    }

    if (current.status === 'full') return
    const username = getUsername()
    if (!username) { showError(null, '상단바에서 유저명을 설정한 뒤 참가할 수 있습니다.'); return }
    try { const updated = await joinReservation(id, username); await refresh(); showNotice(updated.status === 'matched' ? '매칭이 성사되었습니다.' : '참가했습니다. 다른 참가자를 기다리고 있어요.') } catch (error) { showError(error, '참가에 실패했습니다.') }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const username = getUsername()
    if (!username) { showError(null, '상단바에서 유저명을 설정한 뒤 예약을 만들 수 있습니다.'); return }

    const isPlayerMatch = form.type === '플레이어 매치'
    clearNotice()
    try {
      await createReservation({
        start_time: `${form.time}:00`,
        duration_minutes: Number(form.duration),
        display_name: username,
        ranks: isPlayerMatch ? [] : form.ranks,
        match_type: matchTypeValues[form.type],
        capacity: isPlayerMatch ? Number(form.capacity) : 1,
        memo: form.memo,
      })
      await refresh()
      closeForm()
      showNotice('예약을 만들었습니다. 참여자를 기다려 보세요!')
      setForm({ time: '21:00', duration: '60', type: '랭크매치', ranks: ['Vanquisher'], capacity: '1', memo: '' })
    } catch (error) { showError(error, '예약 생성에 실패했습니다.') }
  }

  return (
    <section className="panel relative overflow-hidden" aria-label="예약">
      <div className="absolute inset-0 pointer-events-none opacity-25 [background-image:linear-gradient(rgba(139,124,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(139,124,246,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-border-light pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="panel-meta mb-1 text-primary">MATCH APPOINTMENT / KST</p>
            <h2 className="font-display text-lg tracking-[0.08em] text-white">오늘의 예약</h2>
            <p className="mt-1 text-sm text-txt-dim">미리 약속하고, 접속 시간을 맞춰 보세요.</p>
          </div>
          <button className="btn-primary self-start sm:self-auto" type="button" aria-label="+ 예약 추가" onClick={() => { setShowForm(true); setRankPickerOpen(false); setTimePickerOpen(false) }}>
            <CalendarPlus size={15} aria-hidden="true" /> 예약 추가
          </button>
        </div>

        {showForm && (
          <div className="modal-backdrop">
          <form onSubmit={handleCreate} role="dialog" aria-modal="true" aria-labelledby="reservation-modal-title" className="reservation-modal grid sm:grid-cols-2">
            <div className="reservation-modal-header col-span-full">
              <div><p className="panel-meta mb-1 text-primary">NEW MATCH REQUEST</p><h3 id="reservation-modal-title" className="font-display text-xl font-black tracking-[0.06em] text-white">예약 추가</h3><p className="modal-description">시간과 매치 조건을 설정해 참가자를 모집하세요.</p></div>
              <button type="button" aria-label="예약 추가 닫기" className="modal-close" onClick={closeForm}><X size={16} /></button>
            </div>
            <fieldset className="modal-field relative">
              <legend className="field-label">시작 시각</legend>
              <button type="button" aria-label={`시작 시각 ${form.time}`} aria-haspopup="dialog" aria-expanded={timePickerOpen} onClick={() => { setDraftTime(form.time); setTimePickerOpen((open) => !open) }} className="input-base control-button w-full font-bold">
                <span>{form.time}</span><Clock3 size={15} aria-hidden="true" className="text-primary" />
              </button>
              {timePickerOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-deep/75 p-4 backdrop-blur-sm">
              <div role="dialog" aria-modal="true" aria-label="시간 선택" className="w-full max-w-xs border border-primary-dim bg-bg-panel p-3 shadow-[0_12px_40px_rgba(0,0,0,0.75)]">
                <WheelPickerWrapper className="relative h-48 bg-bg-row">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1/2 z-30 h-[30px] -translate-y-1/2 border-y border-primary-dim" />
                  <WheelPicker value={draftTime.split(':')[0]} onValueChange={(hour) => setDraftTime(`${hour}:${draftTime.split(':')[1]}`)} options={hourOptions} infinite visibleCount={20} classNames={{ optionItem: 'font-display text-base font-medium text-txt-dim', highlightWrapper: 'z-20 bg-bg-row text-primary', highlightItem: 'font-display text-base font-medium text-primary' }} />
                  <WheelPicker value={draftTime.split(':')[1]} onValueChange={(minute) => setDraftTime(`${draftTime.split(':')[0]}:${minute}`)} options={minuteOptions} infinite visibleCount={20} classNames={{ optionItem: 'font-display text-base font-medium text-txt-dim', highlightWrapper: 'z-20 bg-bg-row text-primary', highlightItem: 'font-display text-base font-medium text-primary' }} />
                </WheelPickerWrapper>
                <div className="mt-2 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setTimePickerOpen(false)}>취소</button><button type="button" className="btn-primary" onClick={() => { setForm({ ...form, time: draftTime }); setTimePickerOpen(false) }}>선택 완료</button></div>
              </div>
              </div>}
            </fieldset>
            <fieldset className="modal-field">
              <legend className="field-label">매치 종류</legend>
              <div className="match-type-selector" role="radiogroup" aria-label="매치 종류">
                {matchTypes.slice(1).map((type) => {
                  const selected = form.type === type
                  return <button key={type} type="button" role="radio" aria-checked={selected} onClick={() => { setForm({ ...form, type: type as MatchType }); setRankPickerOpen(false) }} className={`px-3 py-2 text-sm font-bold transition-colors first:border-r first:border-border-light ${selected ? 'bg-primary text-bg-deep shadow-[inset_0_-2px_0_rgba(255,255,255,0.35)]' : 'text-txt-dim hover:bg-primary-hover hover:text-primary'}`}>
                    {type}
                  </button>
                })}
              </div>
            </fieldset>
            <div className="modal-field"><span className="field-label">예상 시간</span>
              <Select label="예상 시간" value={form.duration} options={durationOptions} onChange={(duration) => setForm({ ...form, duration })} />
            </div>
            {form.type !== '플레이어 매치' && <fieldset className="modal-field col-span-full">
              <legend className="field-label">보유 계급 <span className="font-normal">(복수 선택 가능)</span></legend>
              <button type="button" aria-label={form.ranks.length > 0 ? `계급 선택, 현재 ${sortSelectedRanks(form.ranks).join(', ')}` : '계급 선택'} aria-expanded={rankPickerOpen} aria-controls="reservation-rank-picker" onClick={() => setRankPickerOpen((open) => !open)} className="input-base mt-1 flex min-h-12 w-full items-center justify-between gap-3 px-3 py-1.5 text-left">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 text-xs font-normal text-txt-dim">{form.ranks.length > 0 ? `${form.ranks.length}개 선택` : '계급을 선택해 주세요'}</span>
                  {form.ranks.length > 0 && <span className="scroll-area flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                    {sortSelectedRanks(form.ranks).map((rank) => <RankImage key={rank} rankInfo={{ name: rank, tier: rank }} className="h-8 w-auto shrink-0 object-contain" />)}
                  </span>}
                </span>
                <ChevronDown size={15} aria-hidden="true" className={`text-primary transition-transform ${rankPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              {rankPickerOpen && <div id="reservation-rank-picker" className="rank-picker-panel">
                <div className="scroll-area grid max-h-72 grid-cols-4 gap-2 overflow-y-auto pr-1">
                  {rankPickerOptions.map((rank) => {
                    const selected = form.ranks.includes(rank)
                    return <button
                      key={rank}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleRank(rank)}
                      className={`rank-option ${selected ? 'selected' : ''}`}
                    >
                      {selected && <span aria-hidden="true" className="rank-option-check"><Check size={11} /></span>}
                      <RankImage rankInfo={{ name: rank, tier: rank }} className="h-9 max-w-full w-auto object-contain" />
                      <span className={`truncate text-[11px] tracking-[0.03em] ${selected ? 'text-primary' : 'text-txt-dim'}`}>{rank}</span>
                    </button>
                  })}
                </div>
                <div className="mt-2 flex justify-end"><button type="button" className="btn-ghost" onClick={() => setRankPickerOpen(false)}>선택 완료</button></div>
              </div>}
              {form.ranks.length === 0 && <p className="mt-1 text-xs font-normal text-error">계급을 하나 이상 선택해 주세요.</p>}
            </fieldset>}
            {form.type !== '랭크매치' && <div className="modal-field"><span className="field-label">모집 인원</span>
              <Select label="모집 인원" value={form.capacity} options={[{ value: '1', label: '1명' }, { value: '2', label: '2명' }, { value: '3', label: '3명' }]} onChange={(capacity) => setForm({ ...form, capacity })} />
            </div>}
            <label className="modal-field"><span className="field-label">메모 <span className="font-normal">(선택)</span></span>
              <input className="input-base block w-full" maxLength={140} placeholder="예: 부담 없이 1시간 랭매" value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
            </label>
            {noticeBanner && <div className="col-span-full">{noticeBanner}</div>}
            <div className="reservation-modal-actions col-span-full"><button className="btn-ghost" type="button" onClick={closeForm}>취소</button><button className="btn-primary" type="submit" disabled={form.type === '랭크매치' && form.ranks.length === 0}><CalendarPlus size={14} /> 예약 등록</button></div>
          </form>
          </div>
        )}

        <div className="reservation-filter-bar">
          <div className="reservation-filter-heading">
            <span className="reservation-filter-icon" aria-hidden="true"><Filter size={14} /></span>
            <div>
              <strong>예약 필터</strong>
              <small>원하는 매치 조건만 골라보세요.</small>
            </div>
          </div>
          <div className="reservation-filter-controls">
            <Select label="매치 종류 필터" value={typeFilter} options={matchTypes.map((type) => ({ value: type, label: type }))} onChange={setTypeFilter} />
            <Select label="계급 필터" value={rankFilter} options={['전체', ...rankOptions].map((rank) => ({ value: rank, label: rank }))} onChange={setRankFilter} />
          </div>
        </div>

        {!showForm && noticeBanner && <div className="mt-3">{noticeBanner}</div>}

        <div className="reservation-content-grid grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
          <div className="space-y-3">
            {reservationsByTime.map(([time, reservationsAtTime]) => (
              <section key={time} className="reservation-group" aria-label={`${time} 예약`}>
                <div className="mb-3 flex items-baseline gap-3 border-b border-border pb-2">
                  <h3 className="font-display text-2xl font-black tracking-[0.08em] text-white">{time}</h3>
                  <span className="text-xs font-bold tracking-[0.12em] text-txt-dim">예약 {reservationsAtTime.length}건</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {reservationsAtTime.map((reservation) => {
                    const availability = availabilityMeta(reservation)
                    const selected = reservation.id === selectedReservation?.id
                    return <button key={reservation.id} type="button" onClick={() => setSelectedId(reservation.id)} className={`reservation-card grid grid-cols-2 overflow-hidden text-left transition-colors ${selected ? 'selected' : ''}`}>
                      <span className="flex min-w-0 flex-col justify-between px-3 py-3"><strong className="truncate text-base tracking-[0.03em] text-white">{reservation.host}</strong><span className={`w-fit border px-1.5 py-0.5 text-xs font-bold tracking-[0.08em] ${availability.className}`}>{availability.label}</span></span>
                      <span className="flex shrink-0 items-center justify-center border-l border-border bg-bg-row px-3">{reservation.type === '플레이어 매치' ? <span className="flex h-8 items-center border border-primary-dim px-2 text-center text-xs font-bold tracking-[0.04em] text-primary">PLAYER MATCH</span> : <RankSummary ranks={reservation.ranks} imageClassName="h-10" />}</span>
                    </button>
                  })}
                </div>
              </section>
            ))}
          </div>
          {selectedReservation && (() => {
            const availability = availabilityMeta(selectedReservation)
            const joined = joinedIds.includes(selectedReservation.id)
            return <aside className={`reservation-detail ${selectedReservation.status === 'full' ? 'is-full' : ''}`} aria-label="선택한 예약 상세">
              <div className="flex items-start justify-between gap-3"><div><p className="panel-meta mb-1">선택한 예약</p><p className="font-display text-3xl font-black text-white">{selectedReservation.time}</p></div><span className={`border px-2 py-1 text-xs font-bold tracking-[0.12em] ${availability.className}`}>{availability.label}</span></div>
              <div className="mt-4 space-y-3 border-y border-border py-4 text-sm"><p className="flex items-center justify-between"><span className="text-txt-dim">예약자</span><strong className="text-txt">{selectedReservation.host}</strong></p>{selectedReservation.type !== '플레이어 매치' && <div className="flex items-center justify-between"><span className="text-txt-dim">보유 계급</span><RankSummary ranks={selectedReservation.ranks} imageClassName="h-9" /></div>}<p className="flex items-center justify-between"><span className="text-txt-dim">종류</span><strong className="text-primary">{selectedReservation.type}</strong></p><p className="flex items-center justify-between"><span className="text-txt-dim">예상 시간</span><strong className="text-txt">{selectedReservation.duration}</strong></p></div>
              <p className="mt-4 min-h-10 text-sm text-txt-dim">{selectedReservation.memo}</p>
              <button type="button" className={`mt-4 flex min-h-9 w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-bold transition-colors ${joined ? 'border border-primary text-primary hover:bg-primary/10' : selectedReservation.status === 'full' ? 'cursor-not-allowed border border-border bg-bg-panel text-txt-dim' : 'bg-primary text-white hover:bg-primary/85'}`} disabled={selectedReservation.status === 'full' && !joined} onClick={() => handleJoin(selectedReservation.id)}>{joined ? <UserMinus size={15} /> : selectedReservation.status === 'full' ? <X size={15} /> : <LogIn size={15} />}{joined ? '참가 취소' : selectedReservation.status === 'full' ? '모집 마감' : '참가하기'}</button>
            </aside>
          })()}
        </div>
        {visibleReservations.length === 0 && <div className="py-16 text-center"><p className="font-display text-lg text-txt">아직 예약이 없습니다</p><p className="mt-2 text-sm text-txt-dim">원하는 시간에 먼저 예약을 만들어 보세요.</p></div>}
      </div>
    </section>
  )
}
