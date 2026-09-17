import { CalendarPlus, Check, ChevronDown, Clock3, X } from 'lucide-react'
import RankImage from '@/shared/components/RankImage'
import Select from '@/shared/components/Select'
import useModalDialog from '@/shared/hooks/useModalDialog'
import TimePickerDialog from '@/reservation/component/TimePickerDialog'
import { kstDayLabel, sortRanksDescending } from '@/reservation/reservationLabels'
import { isBookable, resolveKstStart } from '@/reservation/bookingWindow'
import { FORM_MATCH_TYPES, MAX_RANKS, type MatchType } from '@/reservation/reservationModel'
import { rankBands } from '@/shared/rankTiers'
import { tierHex } from '@/shared/tierColors'
import type useReservationForm from '@/reservation/useReservationForm'

/** The create/edit dialog.
 *
 * One component for both, deliberately: same fields, same validation, so a rule
 * cannot drift between posting a reservation and editing one. `isCreate` only
 * changes wording.
 *
 * The focus trap is attached here rather than in the panel because the hook
 * runs on mount - the panel stays mounted across the open/closed toggle, so a
 * ref read there would see a null ref and never arm the trap.
 */

type FormApi = ReturnType<typeof useReservationForm>

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

export default function ReservationForm({ formApi, onClose, onSubmit, notice }: {
  formApi: FormApi
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  /** The submit failure, rendered inside the dialog. A form error belongs in
   * the form: the dialog stays open on rejection, so a toast behind it would
   * be reporting on something the user cannot see. */
  notice: React.ReactNode
}) {
  const {
    form, setForm, isEditing,
    rankPickerOpen, setRankPickerOpen,
    timePickerOpen, setTimePickerOpen,
    draftTime, setDraftTime,
    toggleRank, incomplete,
  } = formApi
  const isCreate = !isEditing
  // Read once per render rather than per reference, so the label and the guard
  // below cannot disagree about what "now" is.
  const now = new Date()
  const startDay = kstDayLabel(resolveKstStart(form.time, now), now)
  const startBookable = isBookable(form.time, now)

  return (
      <ReservationFormDialog onClose={onClose} onSubmit={onSubmit}>
        <div className="reservation-modal-header col-span-full">
          <div><p className="panel-meta mb-1 text-primary-text">{isCreate ? 'NEW MATCH REQUEST' : 'EDIT MATCH REQUEST'}</p><h3 id="reservation-modal-title" className="font-display text-xl font-extrabold tracking-[0.06em] text-txt">{isCreate ? '예약 추가' : '예약 수정'}</h3><p className="modal-description">시간과 매치 조건을 설정해 참가자를 모집하세요.</p></div>
          <button type="button" aria-label="닫기" className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        {/* Which day, not just which hour. The listing runs to the next
            morning, so a bare 01:00 cannot say whether it means tonight or a
            day later --- and the backend refuses a time outside that window,
            so the form says so before submitting rather than after. */}
        <fieldset className="modal-field relative">
          <legend className="field-label">시작 시각</legend>
          <button type="button" aria-label={`시작 시각 ${startDay} ${form.time}`} aria-describedby={startBookable ? undefined : 'reservation-time-error'} aria-haspopup="dialog" aria-expanded={timePickerOpen} onClick={() => { setDraftTime(form.time); setTimePickerOpen((open) => !open) }} className="input-base control-button w-full font-bold">
            <span>{startDay} {form.time}</span><Clock3 size={15} aria-hidden="true" className="text-primary" />
          </button>
          {!startBookable && <p id="reservation-time-error" className="mt-1 text-xs font-medium text-error">10분 뒤부터 다음 오전 6시 전까지만 예약할 수 있습니다.</p>}
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
            {FORM_MATCH_TYPES.map((type) => (
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
        {form.type !== '플레이어 매치' && <fieldset className="modal-field col-span-full">
          <legend className="field-label">보유 계급 <span className="font-medium">(복수 선택 가능)</span></legend>
          <button type="button" aria-label={form.ranks.length > 0 ? `계급 선택, 현재 ${sortRanksDescending(form.ranks).join(', ')}` : '계급 선택'} aria-expanded={rankPickerOpen} aria-controls="reservation-rank-picker" onClick={() => setRankPickerOpen((open) => !open)} className="input-base mt-1 flex min-h-12 w-full items-center justify-between gap-3 px-3 py-1.5 text-left">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-txt-dim">{form.ranks.length > 0 ? `${form.ranks.length}개 선택` : '계급을 선택해 주세요'}</span>
              {form.ranks.length > 0 && <span className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {sortRanksDescending(form.ranks).map((rank) => <RankImage key={rank} rankInfo={{ name: rank }} className="h-8 w-auto shrink-0 object-contain" />)}
              </span>}
            </span>
            <ChevronDown size={15} aria-hidden="true" className={`text-primary transition-transform ${rankPickerOpen ? 'rotate-180' : ''}`} />
          </button>
          {rankPickerOpen && <div id="reservation-rank-picker" className="rank-picker-panel">
            {form.ranks.length >= MAX_RANKS && <p role="status" className="mb-2 text-xs font-medium text-txt-dim">계급은 최대 {MAX_RANKS}개까지 선택할 수 있습니다.</p>}
            {/* One block per colour band, strongest first, and inside a band the
                ranks ascend left to right — so 약사 sits in the very top-right
                corner. Chunking the flat list by four put Suzaku (빨강단) on the
                same row as the three 파랑단 ranks, which read as a fourth colour
                in the top row. */}
            <div className="rank-picker-bands max-h-72 overflow-y-auto pr-1">
              {rankBands().map((band) => (
                <div key={band.tier} className="rank-band" style={{ '--tier': tierHex(band.tier) } as React.CSSProperties}>
                  <span className="rank-band-label">{band.tier}</span>
                  <div className="rank-band-grid">
                    {band.rows.flat().map((rank, cell) => {
                      // A short band is padded on the left, so its highest rank
                      // still lands on the flush right edge.
                      if (rank === null) return <span key={`gap-${cell}`} aria-hidden="true" />
                      const selected = form.ranks.includes(rank)
                      // At the cap the remaining tiles go dead rather than failing
                      // on submit: the backend takes 20 ranks and rejects the 21st.
                      const capped = !selected && form.ranks.length >= MAX_RANKS
                      return <button
                        key={rank}
                        type="button"
                        aria-pressed={selected}
                        disabled={capped}
                        onClick={() => toggleRank(rank)}
                        className={`rank-option ${selected ? 'selected' : ''} ${capped ? 'opacity-40' : ''}`}
                      >
                        {selected && <span aria-hidden="true" className="rank-option-check"><Check size={11} /></span>}
                        <RankImage rankInfo={{ name: rank }} className="rank-option-art" />
                        <span className={`truncate text-[11px] tracking-[0.03em] ${selected ? 'text-primary-text' : 'text-txt-dim'}`}>{rank}</span>
                      </button>
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end"><button type="button" className="btn-ghost" onClick={() => setRankPickerOpen(false)}>선택 완료</button></div>
          </div>}
          {incomplete && <p className="mt-1 text-xs font-medium text-error">계급을 하나 이상 선택해 주세요.</p>}
        </fieldset>}
        {form.type !== '랭크매치' && <div className="modal-field"><span className="field-label">모집 인원</span>
          <Select label="모집 인원" value={form.capacity} options={[{ value: '1', label: '1명' }, { value: '2', label: '2명' }, { value: '3', label: '3명' }]} onChange={(capacity) => setForm({ ...form, capacity })} />
        </div>}
        <label className="modal-field"><span className="field-label">메모 <span className="font-medium">(선택)</span></span>
          <input className="input-base block w-full" maxLength={140} placeholder="예: 부담 없이 1시간 랭매" value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
        </label>
        {notice && <div className="col-span-full">{notice}</div>}
        <div className="reservation-modal-actions col-span-full"><button className="btn-ghost" type="button" onClick={onClose}>취소</button><button className="btn-primary" type="submit" disabled={incomplete}><CalendarPlus size={14} /> {isCreate ? '예약 등록' : '예약 수정'}</button></div>
      </ReservationFormDialog>
  )
}
