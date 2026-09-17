import RankImage from '@/shared/components/RankImage'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUsername } from '@/shared/util/cookie'
import {
  cancelParticipation, cancelReservation, createReservation,
  hasParticipation, isOwner, joinReservation, updateReservation,
} from './reservationApi'
import useReservations from '@/reservation/useReservations'
import { POLL } from '@/config/polling'
import { statusBody } from '@/shared/util/panelStatus'
import { ListSkeleton } from '@/shared/components/Skeleton'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import useConfirm from '@/shared/hooks/useConfirm'
import { CalendarPlus, Check, ChevronLeft, Filter, LogIn, Pencil, Plus, Trash2, UserMinus, X } from 'lucide-react'
import ToggleGroup from '@/shared/components/ToggleGroup'
import { reservationPath } from '@/config/routes'
import { sortRanksDescending } from '@/reservation/reservationLabels'
import CommentList from '@/reservation/component/CommentList'
import RankSummary from '@/reservation/component/RankSummary'
import ReservationForm from '@/reservation/component/ReservationForm'
import useReservationForm, { blankForm } from '@/reservation/useReservationForm'
import {
  availabilityMeta, fromApi, matchesFilter, TYPE_FILTERS,
  type Reservation, type TypeFilter,
} from '@/reservation/reservationModel'
import type { LeaderboardEntry } from '@/shared/types'

export default function Reservation({ leaderboardEntries = [] }: { leaderboardEntries?: LeaderboardEntry[] }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('전체')
  // The list is the app's single reservation poll, shared with the sidebar
  // badge. Asking for the faster rate speeds that one poll up while this panel
  // is open rather than starting a second one alongside it.
  const source = useReservations(POLL.reservationsActive)
  const reservations = useMemo(() => (source.data ?? []).map(fromApi), [source.data])
  const joinedIds = useMemo(
    () => reservations.filter((item) => hasParticipation(item.id)).map((item) => item.id),
    [reservations],
  )
  // Which reservation the detail pane shows is the path's answer, so a shared
  // link opens on it and the back button steps between the ones you looked at.
  const { id: selectedParam } = useParams()
  const navigate = useNavigate()
  const selectedId = selectedParam ? Number(selectedParam) : null
  const setSelectedId = (id: number) => navigate(reservationPath(id))
  const formApi = useReservationForm()
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' }>({ text: '', tone: 'info' })
  const showNotice = (text: string) => setNotice({ text, tone: 'info' })
  // Stable across renders: CommentList takes this as a prop and reloads when its
  // identity changes, so a fresh closure each render would refetch forever.
  const showError = useCallback((error: unknown, fallback: string) => setNotice({ text: error instanceof Error ? error.message : fallback, tone: 'error' }), [])
  const clearNotice = () => setNotice({ text: '', tone: 'info' })
  const { confirm, ...confirmDialog } = useConfirm()

  const refresh = source.refresh

  const noticeBanner = notice.text && (
    <p
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={`border-l-2 px-3 py-2 text-sm font-semibold ${notice.tone === 'error' ? 'border-error bg-error/8 text-error' : 'border-primary bg-primary/8 text-primary-text'}`}
    >{notice.text}</p>
  )

  const closeForm = () => { formApi.close(); clearNotice() }

  // A failed list refresh stays on screen when the form opens: the host posting
  // a reservation does not make the reason the list could not load less true.
  const openCreateForm = () => formApi.openCreate()

  const openEditForm = (reservation: Reservation) => { formApi.openEdit(reservation); clearNotice() }

  const visibleReservations = useMemo(
    () => reservations.filter((reservation) => matchesFilter(reservation, typeFilter)),
    [reservations, typeFilter],
  )
  // Falling back to visibleReservations[0] used to mean that changing the
  // filter while /reservation/42 was open silently showed a *different*
  // reservation under that URL. The path is the selection, so a filtered-out id
  // is reported rather than quietly substituted; with no id in the path at all
  // the first card is a sensible landing choice and stays.
  const selectedExists = selectedId != null && reservations.some((reservation) => reservation.id === selectedId)
  const selectedHidden = selectedExists && !visibleReservations.some((reservation) => reservation.id === selectedId)
  const selectedReservation = selectedId == null
    ? visibleReservations[0]
    : visibleReservations.find((reservation) => reservation.id === selectedId)
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
    const agreed = await confirm({
      title: '예약을 삭제할까요?',
      body: participants > 0
        ? `참가자 ${participants}명의 참가도 함께 취소됩니다.`
        : '삭제한 예약은 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
    })
    if (!agreed) return

    try {
      await cancelReservation(id)
      await refresh()
      showNotice('예약을 삭제했습니다.')
    } catch (error) { showError(error, '예약 삭제에 실패했습니다.') }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const { editingId, conditions } = formApi
    const creating = editingId === null
    const username = getUsername()
    if (!username) { showError(null, `상단바에서 유저명을 설정한 뒤 예약을 ${creating ? '만들' : '수정할'} 수 있습니다.`); return }

    clearNotice()
    try {
      if (creating) await createReservation({ ...conditions(), display_name: username })
      else await updateReservation(editingId, conditions())
      await refresh()
      closeForm()
      showNotice(creating ? '예약을 만들었습니다. 참여자를 기다려 보세요!' : '예약을 수정했습니다.')
      formApi.setForm(blankForm())
    } catch (error) { showError(error, creating ? '예약 생성에 실패했습니다.' : '예약 수정에 실패했습니다.') }
  }

  // Scoped to the list, never the whole panel. The same rule the tab strip
  // follows: the chrome around the data — the filter, the "예약 추가" button —
  // is not waiting on the response and must not disappear while it is in
  // flight. Only the first load shows this; a failed refresh keeps the
  // reservations already on screen rather than replacing them with an error.
  const listStatus = source.data === null
    ? statusBody(source.loading, source.error, {
        loadingMsg: '예약을 불러오는 중',
        onRetry: source.refresh,
        skeleton: <ListSkeleton rows={3} label="예약을 불러오는 중" />,
      })
    : null

  return (
    // `has-selection` is what lets a phone show the list and the detail one at
    // a time. Keyed off the URL rather than off `selectedReservation`, which
    // falls back to the first row so the desktop's detail column is never
    // empty --- that fallback is not a selection the reader made.
    <section className={`panel relative overflow-hidden${selectedId != null && selectedReservation ? ' has-selection' : ''}`} aria-label="예약">
      <div className="absolute inset-0 pointer-events-none opacity-25 [background-image:linear-gradient(rgba(230,57,70,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(230,57,70,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      {confirmDialog.request && <ConfirmDialog {...confirmDialog} request={confirmDialog.request} />}
      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-border-light pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="panel-meta mb-1 text-primary-text">MATCH APPOINTMENT / KST</p>
            <h3 className="font-display text-[15px] font-bold tracking-[0.08em] text-txt">오늘의 예약</h3>
            <p className="mt-1 text-sm text-txt-dim">미리 약속하고, 접속 시간을 맞춰 보세요.</p>
          </div>
          <button className="btn-primary self-start sm:self-auto" type="button" aria-label="+ 예약 추가" onClick={openCreateForm}>
            <CalendarPlus size={15} aria-hidden="true" /> 예약 추가
          </button>
        </div>

        {formApi.open && (
          <ReservationForm
            formApi={formApi}
            onClose={closeForm}
            onSubmit={handleSubmit}
            notice={noticeBanner}
          />
        )}

        {/* The same bar every other section heads with, not a filter widget of
            its own: one icon size, one title size, one alignment against the
            control beside it. */}
        <div className="section-toolbar filter-toolbar">
          <div className="section-title">
            <span className="section-icon" aria-hidden="true"><Filter size={14} /></span>
            <div>
              <strong>예약 필터</strong>
              <small>원하는 매치 조건만 골라보세요.</small>
            </div>
          </div>
          <div className="section-controls">
            <ToggleGroup label="매치 종류 필터" value={typeFilter} options={TYPE_FILTERS.map((type) => ({ value: type, label: type }))} onChange={setTypeFilter} />
          </div>
        </div>

        {!formApi.open && noticeBanner && <div className="mt-3">{noticeBanner}</div>}

        {selectedHidden && (
          <p role="status" className="reservation-hidden-notice">
            열어둔 예약은 <strong>{typeFilter}</strong> 필터에 포함되지 않습니다.
            <button type="button" className="btn-ghost" onClick={() => setTypeFilter('전체')}>필터 해제</button>
          </p>
        )}

        {listStatus && <div className="mt-4">{listStatus}</div>}

        {!listStatus && <div className="reservation-content-grid grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
          <div className="reservation-list space-y-3">
            {reservationsByTime.map(([time, reservationsAtTime]) => (
              <section key={time} className="reservation-group" aria-label={`${time} 예약`}>
                <div className="mb-3 flex items-baseline gap-3 border-b border-border pb-2">
                  <h3 className="font-display text-2xl font-extrabold tracking-[0.08em] text-txt">{time}</h3>
                  <span className="text-xs font-bold tracking-[0.12em] text-txt-dim">예약 {reservationsAtTime.length}건</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {reservationsAtTime.map((reservation) => {
                    const availability = availabilityMeta(reservation)
                    const selected = reservation.id === selectedReservation?.id
                    return <button key={reservation.id} type="button" onClick={() => setSelectedId(reservation.id)} className={`reservation-card grid grid-cols-2 overflow-hidden text-left transition-colors ${selected ? 'selected' : ''}`}>
                      <span className="flex min-w-0 flex-col justify-between px-3 py-3"><strong className="truncate text-base tracking-[0.03em] text-txt">{reservation.host}</strong><span className={`w-fit border px-1.5 py-0.5 text-xs font-bold tracking-[0.08em] ${availability.className}`}>{availability.label}</span></span>
                      <span className="flex min-w-0 items-center justify-center border-l border-border bg-bg-row px-2">{reservation.type === '플레이어 매치' || (reservation.type === '상관없음' && reservation.ranks.length === 0) ? <span className="flex h-8 items-center border border-primary-dim px-2 text-center text-xs font-bold tracking-[0.04em] text-primary-text">{reservation.type === '상관없음' ? 'ANY MATCH' : 'PLAYER MATCH'}</span> : <RankSummary ranks={reservation.ranks} imageClassName="h-7" max={3} />}</span>
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
              {/* Hidden on the roomy layout, where the list is still beside
                  this and there is nothing to go back to. */}
              <button type="button" className="reservation-detail-back btn-ghost" onClick={() => navigate('/reservation')}><ChevronLeft size={15} aria-hidden="true" /> 목록으로</button>
              <div className="flex items-start justify-between gap-3"><div><p className="panel-meta mb-1">선택한 예약</p><p className="font-display text-3xl font-extrabold text-txt">{selectedReservation.time}</p></div><span className={`border px-2 py-1 text-xs font-bold tracking-[0.12em] ${availability.className}`}>{availability.label}</span></div>
              <div className="mt-4 space-y-3 border-y border-border py-4 text-sm"><p className="flex items-center justify-between"><span className="text-txt-dim">예약자</span><strong className="text-txt">{selectedReservation.host}</strong></p>{selectedReservation.ranks.length > 0 && <div className="flex items-start justify-between gap-3"><span className="shrink-0 text-txt-dim">보유 계급</span><RankSummary ranks={selectedReservation.ranks} imageClassName="h-8" className="flex-1 justify-end" /></div>}<p className="flex items-center justify-between"><span className="text-txt-dim">종류</span><strong className="text-primary-text">{selectedReservation.type}</strong></p></div>
              <section className="reservation-roster" aria-label="참가자 명단">
                <div className="reservation-roster-heading">
                  <h4>참가자 <span className="reservation-roster-count">{selectedReservation.joined}/{selectedReservation.capacity}명</span></h4>
                  <span className="reservation-roster-helper">방장 제외</span>
                </div>
                {selectedReservation.participants === undefined
                  ? <p className="reservation-roster-message">참가자 명단을 아직 확인할 수 없습니다.</p>
                  : <>
                    {selectedReservation.participants.length === 0 && <p className="reservation-roster-message">아직 참가자가 없습니다.</p>}
                    <ul className="reservation-roster-slots">
                      {selectedReservation.participants.map((participant) => {
                        const entry = leaderboardEntries.find(item => item.online_name === participant.display_name)
                        const ranks = [entry?.player_info?.main_char_info?.rank_info, entry?.player_info?.sub_char_info?.rank_info]
                        const highestName = sortRanksDescending(ranks.flatMap(rank => rank?.name ? [rank.name] : []))[0]
                        const highestRank = ranks.find(rank => rank?.name === highestName)
                        return <li key={participant.id} className="reservation-roster-slot is-occupied" aria-label={participant.display_name}>
                          <span className="reservation-roster-position" aria-label={entry ? `리더보드 ${entry.rank}위` : '리더보드 순위 없음'}>
                            <strong>{entry ? `#${entry.rank}` : '—'}</strong>
                          </span>
                          <div className="reservation-roster-inline">
                            <span className="reservation-roster-best-rank" aria-label={`최고 계급 ${highestName ?? '정보 없음'}`}>
                              <RankImage rankInfo={highestRank} className="reservation-roster-rank-image" />
                            </span>
                            <strong className="reservation-roster-name" title={participant.display_name}>{participant.display_name}</strong>
                            <span className="reservation-roster-status"><Check size={12} strokeWidth={3} aria-hidden="true" />참가 완료</span>
                          </div>
                        </li>
                      })}
                      {Array.from({ length: Math.max(0, selectedReservation.capacity - selectedReservation.joined) }, (_, index) => <li key={`empty-${index}`} className="reservation-roster-slot is-empty" aria-label="참가 대기">
                        <span className="reservation-roster-avatar" aria-hidden="true"><Plus size={20} strokeWidth={1.5} /></span>
                        <div className="reservation-roster-person"><strong>참가 대기</strong><span className="reservation-roster-waiting">함께할 플레이어를 기다리고 있어요</span></div>
                      </li>)}
                    </ul>
                  </>}
              </section>
              <p className="mt-4 min-h-10 text-sm text-txt-dim">{selectedReservation.memo}</p>
              {owned
                ? <div className="mt-4">
                    {/* Not two halves of a split row. They were the same size,
                        the same outlined treatment and two neighbouring warm
                        hues, so the destructive one carried exactly as much
                        weight as the one you actually came here to press — and
                        on this theme red is the *brand*, not a warning, so the
                        colour could not tell them apart either. Editing is the
                        action, so it takes the fill and the width; deleting is
                        rare and irreversible, so it stays quiet until pointed
                        at and only then turns red. */}
                    <div className="reservation-owner-actions">
                      <button type="button" className="btn-primary" disabled={frozen} aria-describedby={frozen ? 'reservation-edit-frozen' : undefined} onClick={() => openEditForm(selectedReservation)}><Pencil size={14} aria-hidden="true" /> 예약 수정</button>
                      <button type="button" className="btn-quiet-danger" onClick={() => handleDelete(selectedReservation.id)}><Trash2 size={14} aria-hidden="true" /> 예약 삭제</button>
                    </div>
                    {/* A title tooltip cannot be reached on a disabled control by
                        keyboard or touch, so the reason is rendered in the flow. */}
                    {frozen && <p id="reservation-edit-frozen" className="mt-2 text-xs text-txt-faint">참가자가 있는 예약은 수정할 수 없습니다. 삭제 후 다시 등록해 주세요.</p>}
                  </div>
                : <button type="button" className={`mt-4 flex min-h-9 w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-bold transition-colors ${joined ? 'border border-primary text-primary-text hover:bg-primary/10' : selectedReservation.status === 'full' ? 'cursor-not-allowed border border-border bg-bg-panel text-txt-dim' : 'bg-primary text-bg-deep hover:bg-primary/85'}`} disabled={selectedReservation.status === 'full' && !joined} onClick={() => handleJoin(selectedReservation.id)}>{joined ? <UserMinus size={15} /> : selectedReservation.status === 'full' ? <X size={15} /> : <LogIn size={15} />}{joined ? '참가 취소' : selectedReservation.status === 'full' ? '모집 완료' : '참가하기'}</button>}
              <CommentList reservationId={selectedReservation.id} username={getUsername()} onError={showError} />
            </aside>
          })()}
        </div>}
        {!listStatus && visibleReservations.length === 0 && <div className="py-16 text-center"><p className="font-display text-lg text-txt">아직 예약이 없습니다</p><p className="mt-2 text-sm text-txt-dim">원하는 시간에 먼저 예약을 만들어 보세요.</p></div>}
      </div>
    </section>
  )
}
