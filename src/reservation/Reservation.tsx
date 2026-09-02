import { useEffect, useMemo, useState } from 'react'
import { WheelPicker, WheelPickerWrapper, type WheelPickerOption } from '@ncdai/react-wheel-picker'
import '@ncdai/react-wheel-picker/style.css'
import RankImage from '@/shared/components/RankImage'
import useModalDialog from '@/shared/hooks/useModalDialog'
import { getUsername } from '@/shared/util/cookie'
import { cancelParticipation, cancelReservation, createReservation, fetchReservations, hasParticipation, isOwner, joinReservation, updateReservation, type ApiReservation } from './reservationApi'
import { CalendarPlus, Check, ChevronDown, Clock3, Filter, LogIn, UserMinus, X } from 'lucide-react'
import Select from '@/shared/components/Select'

type MatchType = '랭크매치' | '플레이어 매치' | '상관없음'
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
const matchTypes: Array<MatchType | '전체'> = ['전체', '랭크매치', '플레이어 매치', '상관없음']
const durationOptions = [
  { value: '30', label: '약 30분' },
  { value: '60', label: '약 1시간' },
  { value: '120', label: '약 2시간' },
  { value: '180', label: '약 3시간' },
]
const durationLabels = new Map(durationOptions.map(({ value, label }) => [Number(value), label]))
const matchTypeLabels: Record<ApiReservation['match_type'], MatchType> = { rank_match: '랭크매치', player_match: '플레이어 매치', any: '상관없음' }
const matchTypeValues: Record<MatchType, ApiReservation['match_type']> = { '랭크매치': 'rank_match', '플레이어 매치': 'player_match', '상관없음': 'any' }
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

type FormState = { time: string; duration: string; type: MatchType; ranks: string[]; capacity: string; memo: string }

const kstHourFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false })

/** The next whole hour in Seoul, which is where a host most likely wants to start.
 *
 * Rounding down instead would always land in the past and be rejected by the
 * backend's ten-minute lead time. The 23:00 hour has no valid next hour at all —
 * the API takes a time of day with no date, so midnight resolves to *today*
 * midnight — and stays at 23:00 rather than offering a slot that cannot be booked.
 */
function nextHourInSeoul(now = new Date()): string {
  const hour = Number(kstHourFormat.format(now))
  return `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`
}

const blankForm = (): FormState => ({ time: nextHourInSeoul(), duration: '60', type: '랭크매치', ranks: ['Vanquisher'], capacity: '1', memo: '' })

const durationValues = new Map(Array.from(durationLabels, ([minutes, label]) => [label, String(minutes)]))

/** Reverse of the create mapping, so editing starts from what the host posted. */
function toForm(reservation: Reservation): FormState {
  return {
    time: reservation.time,
    duration: durationValues.get(reservation.duration) ?? '60',
    type: reservation.type,
    ranks: reservation.ranks,
    capacity: String(reservation.capacity),
    memo: reservation.memo,
  }
}

function availabilityMeta(reservation: Reservation) {
  if (reservation.status === 'full') return { label: '마감', className: 'border-secondary text-secondary bg-secondary/10' }
  if (reservation.type === '랭크매치') return { label: '모집중', className: 'border-primary text-primary-text bg-primary/10' }
  return { label: `${reservation.joined}/${reservation.capacity}명`, className: 'border-primary text-primary-text bg-primary/10' }
}

function RankSummary({ ranks, imageClassName = 'h-8' }: { ranks: string[], imageClassName?: string }) {
  if (ranks.length === 0) return null
  const sortedRanks = sortSelectedRanks(ranks)
  return <span className="relative flex shrink-0 items-center justify-center" aria-label={sortedRanks.join(', ')}>
    <RankImage rankInfo={{ name: sortedRanks[0], tier: sortedRanks[0] }} className={`${imageClassName} w-auto object-contain`} />
    {ranks.length > 1 && <span aria-label={`추가 계급 ${ranks.length - 1}개`} className="absolute left-full ml-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-primary-dim bg-primary/10 px-1 text-xs font-black text-primary-text">+{ranks.length - 1}</span>}
  </span>
}

// Mounts with the form so the focus trap starts when the dialog opens, not when
// the page does. Reservation() stays mounted across the showForm toggle, so a
// hook called there would see a null ref and never re-run.
function ReservationFormDialog({ onClose, onSubmit, children }: {
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  children: React.ReactNode
}) {
  const dialogRef = useModalDialog<HTMLFormElement>(onClose)
  return (
    <div className="modal-backdrop">
      <form ref={dialogRef} onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="reservation-modal-title" className="reservation-modal grid sm:grid-cols-2">
        {children}
      </form>
    </div>
  )
}

function TimePickerDialog({ draftTime, setDraftTime, onCancel, onConfirm }: {
  draftTime: string
  setDraftTime: (time: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialogRef = useModalDialog<HTMLDivElement>(onCancel)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-deep/75 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="시간 선택" className="w-full max-w-xs border border-primary-dim bg-bg-panel p-3 shadow-[0_12px_40px_rgba(0,0,0,0.75)]">
        <WheelPickerWrapper className="relative h-48 bg-bg-row">
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1/2 z-30 h-[30px] -translate-y-1/2 border-y border-primary-dim" />
          <WheelPicker value={draftTime.split(':')[0]} onValueChange={(hour) => setDraftTime(`${hour}:${draftTime.split(':')[1]}`)} options={hourOptions} infinite visibleCount={20} classNames={{ optionItem: 'font-display text-base font-medium text-txt-dim', highlightWrapper: 'z-20 bg-bg-row text-primary-text', highlightItem: 'font-display text-base font-medium text-primary-text' }} />
          <WheelPicker value={draftTime.split(':')[1]} onValueChange={(minute) => setDraftTime(`${draftTime.split(':')[0]}:${minute}`)} options={minuteOptions} infinite visibleCount={20} classNames={{ optionItem: 'font-display text-base font-medium text-txt-dim', highlightWrapper: 'z-20 bg-bg-row text-primary-text', highlightItem: 'font-display text-base font-medium text-primary-text' }} />
        </WheelPickerWrapper>
        <div className="mt-2 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onCancel}>취소</button><button type="button" className="btn-primary" onClick={onConfirm}>선택 완료</button></div>
      </div>
    </div>
  )
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
  const [draftTime, setDraftTime] = useState(nextHourInSeoul)
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' }>({ text: '', tone: 'info' })
  const showNotice = (text: string) => setNotice({ text, tone: 'info' })
  const showError = (error: unknown, fallback: string) => setNotice({ text: error instanceof Error ? error.message : fallback, tone: 'error' })
  const clearNotice = () => setNotice({ text: '', tone: 'info' })
  const [form, setForm] = useState<FormState>(blankForm)
  const [editingId, setEditingId] = useState<number | null>(null)

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
      className={`border-l-2 px-3 py-2 text-sm font-semibold ${notice.tone === 'error' ? 'border-error bg-error/8 text-error' : 'border-primary bg-primary/8 text-primary-text'}`}
    >{notice.text}</p>
  )

  const closeForm = () => { setShowForm(false); setEditingId(null); setRankPickerOpen(false); setTimePickerOpen(false); clearNotice() }

  const openCreateForm = () => {
    // Recomputed per open: a tab left sitting since morning would otherwise
    // still offer the hour that was next when the page loaded.
    setForm(blankForm())
    setEditingId(null)
    setShowForm(true)
    setRankPickerOpen(false)
    setTimePickerOpen(false)
    // A failed list refresh stays on screen: the host opening the form does not
    // make the reason it could not load any less true.
  }

  const openEditForm = (reservation: Reservation) => {
    setForm(toForm(reservation))
    setEditingId(reservation.id)
    setShowForm(true)
    setRankPickerOpen(false)
    setTimePickerOpen(false)
    clearNotice()
  }

  const toggleRank = (rank: string) => {
    setForm((current) => ({
      ...current,
      ranks: sortSelectedRanks(current.ranks.includes(rank)
        ? current.ranks.filter((selectedRank) => selectedRank !== rank)
        : [...current.ranks, rank]),
    }))
  }

  // A '상관없음' host takes either game, so both single-type filters keep them.
  const visibleReservations = useMemo(
    () => reservations.filter((reservation) =>
      (typeFilter === '전체' || reservation.type === typeFilter || reservation.type === '상관없음')
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

  const handleDelete = async (id: number) => {
    const participants = reservations.find((reservation) => reservation.id === id)?.joined ?? 0
    const warning = participants > 0
      ? `참가자 ${participants}명의 참가도 함께 취소됩니다. 예약을 삭제할까요?`
      : '이 예약을 삭제할까요?'
    if (!confirm(warning)) return

    try {
      await cancelReservation(id)
      await refresh()
      showNotice('예약을 삭제했습니다.')
    } catch (error) { showError(error, '예약 삭제에 실패했습니다.') }
  }

  const conditionsFromForm = () => ({
    start_time: `${form.time}:00`,
    duration_minutes: Number(form.duration),
    ranks: form.type === '플레이어 매치' ? [] : form.ranks,
    match_type: matchTypeValues[form.type],
    capacity: form.type === '랭크매치' ? 1 : Number(form.capacity),
    memo: form.memo,
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const username = getUsername()
    if (!username) { showError(null, `상단바에서 유저명을 설정한 뒤 예약을 ${editingId === null ? '만들' : '수정할'} 수 있습니다.`); return }

    clearNotice()
    try {
      if (editingId === null) await createReservation({ ...conditionsFromForm(), display_name: username })
      else await updateReservation(editingId, conditionsFromForm())
      const created = editingId === null
      await refresh()
      closeForm()
      showNotice(created ? '예약을 만들었습니다. 참여자를 기다려 보세요!' : '예약을 수정했습니다.')
      setForm(blankForm())
    } catch (error) { showError(error, editingId === null ? '예약 생성에 실패했습니다.' : '예약 수정에 실패했습니다.') }
  }

  return (
    <section className="panel relative overflow-hidden" aria-label="예약">
      <div className="absolute inset-0 pointer-events-none opacity-25 [background-image:linear-gradient(rgba(230,57,70,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(230,57,70,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-border-light pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="panel-meta mb-1 text-primary-text">MATCH APPOINTMENT / KST</p>
            <h2 className="font-display text-lg tracking-[0.08em] text-white">오늘의 예약</h2>
            <p className="mt-1 text-sm text-txt-dim">미리 약속하고, 접속 시간을 맞춰 보세요.</p>
          </div>
          <button className="btn-primary self-start sm:self-auto" type="button" aria-label="+ 예약 추가" onClick={openCreateForm}>
            <CalendarPlus size={15} aria-hidden="true" /> 예약 추가
          </button>
        </div>

        {showForm && (
          <ReservationFormDialog onClose={closeForm} onSubmit={handleSubmit}>
            <div className="reservation-modal-header col-span-full">
              <div><p className="panel-meta mb-1 text-primary-text">{editingId === null ? 'NEW MATCH REQUEST' : 'EDIT MATCH REQUEST'}</p><h3 id="reservation-modal-title" className="font-display text-xl font-black tracking-[0.06em] text-white">{editingId === null ? '예약 추가' : '예약 수정'}</h3><p className="modal-description">시간과 매치 조건을 설정해 참가자를 모집하세요.</p></div>
              <button type="button" aria-label="닫기" className="modal-close" onClick={closeForm}><X size={16} /></button>
            </div>
            <fieldset className="modal-field relative">
              <legend className="field-label">시작 시각</legend>
              <button type="button" aria-label={`시작 시각 ${form.time}`} aria-haspopup="dialog" aria-expanded={timePickerOpen} onClick={() => { setDraftTime(form.time); setTimePickerOpen((open) => !open) }} className="input-base control-button w-full font-bold">
                <span>{form.time}</span><Clock3 size={15} aria-hidden="true" className="text-primary" />
              </button>
              {timePickerOpen && <TimePickerDialog
                draftTime={draftTime}
                setDraftTime={setDraftTime}
                onCancel={() => setTimePickerOpen(false)}
                onConfirm={() => { setForm({ ...form, time: draftTime }); setTimePickerOpen(false) }}
              />}
            </fieldset>
            <fieldset className="modal-field">
              <legend className="field-label">매치 종류</legend>
              <div className="match-type-selector" role="radiogroup" aria-label="매치 종류">
                {/* Native radios: the browser supplies one tab stop, arrow-key
                    navigation and the group semantics. The visible chip is the
                    label, styled off :checked. */}
                {matchTypes.slice(1).map((type) => (
                  <label key={type} className="match-type-option">
                    <input
                      type="radio"
                      name="reservation-match-type"
                      value={type}
                      checked={form.type === type}
                      onChange={() => { setForm({ ...form, type: type as MatchType }); setRankPickerOpen(false) }}
                    />
                    <span>{type}</span>
                  </label>
                ))}
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
                      <span className={`truncate text-[11px] tracking-[0.03em] ${selected ? 'text-primary-text' : 'text-txt-dim'}`}>{rank}</span>
                    </button>
                  })}
                </div>
                <div className="mt-2 flex justify-end"><button type="button" className="btn-ghost" onClick={() => setRankPickerOpen(false)}>선택 완료</button></div>
              </div>}
              {form.type === '랭크매치' && form.ranks.length === 0 && <p className="mt-1 text-xs font-normal text-error">계급을 하나 이상 선택해 주세요.</p>}
            </fieldset>}
            {form.type !== '랭크매치' && <div className="modal-field"><span className="field-label">모집 인원</span>
              <Select label="모집 인원" value={form.capacity} options={[{ value: '1', label: '1명' }, { value: '2', label: '2명' }, { value: '3', label: '3명' }]} onChange={(capacity) => setForm({ ...form, capacity })} />
            </div>}
            <label className="modal-field"><span className="field-label">메모 <span className="font-normal">(선택)</span></span>
              <input className="input-base block w-full" maxLength={140} placeholder="예: 부담 없이 1시간 랭매" value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
            </label>
            {noticeBanner && <div className="col-span-full">{noticeBanner}</div>}
            <div className="reservation-modal-actions col-span-full"><button className="btn-ghost" type="button" onClick={closeForm}>취소</button><button className="btn-primary" type="submit" disabled={form.type === '랭크매치' && form.ranks.length === 0}><CalendarPlus size={14} /> {editingId === null ? '예약 등록' : '예약 수정'}</button></div>
          </ReservationFormDialog>
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
                      <span className="flex shrink-0 items-center justify-center border-l border-border bg-bg-row px-3">{reservation.type === '플레이어 매치' || (reservation.type === '상관없음' && reservation.ranks.length === 0) ? <span className="flex h-8 items-center border border-primary-dim px-2 text-center text-xs font-bold tracking-[0.04em] text-primary-text">{reservation.type === '상관없음' ? 'ANY MATCH' : 'PLAYER MATCH'}</span> : <RankSummary ranks={reservation.ranks} imageClassName="h-10" />}</span>
                    </button>
                  })}
                </div>
              </section>
            ))}
          </div>
          {selectedReservation && (() => {
            const availability = availabilityMeta(selectedReservation)
            const joined = joinedIds.includes(selectedReservation.id)
            const owned = isOwner(selectedReservation.id)
            // The backend refuses an edit once anyone has joined; say so here
            // rather than letting the host find out by being rejected.
            const frozen = selectedReservation.joined > 0
            return <aside className={`reservation-detail ${selectedReservation.status === 'full' ? 'is-full' : ''}`} aria-label="선택한 예약 상세">
              <div className="flex items-start justify-between gap-3"><div><p className="panel-meta mb-1">선택한 예약</p><p className="font-display text-3xl font-black text-white">{selectedReservation.time}</p></div><span className={`border px-2 py-1 text-xs font-bold tracking-[0.12em] ${availability.className}`}>{availability.label}</span></div>
              <div className="mt-4 space-y-3 border-y border-border py-4 text-sm"><p className="flex items-center justify-between"><span className="text-txt-dim">예약자</span><strong className="text-txt">{selectedReservation.host}</strong></p>{selectedReservation.ranks.length > 0 && <div className="flex items-center justify-between"><span className="text-txt-dim">보유 계급</span><RankSummary ranks={selectedReservation.ranks} imageClassName="h-9" /></div>}<p className="flex items-center justify-between"><span className="text-txt-dim">종류</span><strong className="text-primary-text">{selectedReservation.type}</strong></p><p className="flex items-center justify-between"><span className="text-txt-dim">예상 시간</span><strong className="text-txt">{selectedReservation.duration}</strong></p></div>
              <p className="mt-4 min-h-10 text-sm text-txt-dim">{selectedReservation.memo}</p>
              {owned
                ? <div className="mt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className={`border py-2 text-sm font-bold transition-colors ${frozen ? 'cursor-not-allowed border-border bg-bg-panel text-txt-dim' : 'border-primary text-primary-text hover:bg-primary/10'}`} disabled={frozen} aria-describedby={frozen ? 'reservation-edit-frozen' : undefined} onClick={() => openEditForm(selectedReservation)}>예약 수정</button>
                      <button type="button" className="border border-error py-2 text-sm font-bold text-error transition-colors hover:bg-error/10" onClick={() => handleDelete(selectedReservation.id)}>예약 삭제</button>
                    </div>
                    {/* A title tooltip cannot be reached on a disabled control by
                        keyboard or touch, so the reason is rendered in the flow. */}
                    {frozen && <p id="reservation-edit-frozen" className="mt-2 text-xs text-txt-faint">참가자가 있는 예약은 수정할 수 없습니다. 삭제 후 다시 등록해 주세요.</p>}
                  </div>
                : <button type="button" className={`mt-4 flex min-h-9 w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-bold transition-colors ${joined ? 'border border-primary text-primary-text hover:bg-primary/10' : selectedReservation.status === 'full' ? 'cursor-not-allowed border border-border bg-bg-panel text-txt-dim' : 'bg-primary text-bg-deep hover:bg-primary/85'}`} disabled={selectedReservation.status === 'full' && !joined} onClick={() => handleJoin(selectedReservation.id)}>{joined ? <UserMinus size={15} /> : selectedReservation.status === 'full' ? <X size={15} /> : <LogIn size={15} />}{joined ? '참가 취소' : selectedReservation.status === 'full' ? '모집 마감' : '참가하기'}</button>}
            </aside>
          })()}
        </div>
        {visibleReservations.length === 0 && <div className="py-16 text-center"><p className="font-display text-lg text-txt">아직 예약이 없습니다</p><p className="mt-2 text-sm text-txt-dim">원하는 시간에 먼저 예약을 만들어 보세요.</p></div>}
      </div>
    </section>
  )
}
