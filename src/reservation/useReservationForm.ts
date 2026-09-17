import { defaultStartTime } from '@/reservation/bookingWindow'
import { useState } from 'react'
import { sortRanksDescending } from '@/reservation/reservationLabels'
import {
  MAX_RANKS, matchTypeValues, type MatchType, type Reservation,
} from '@/reservation/reservationModel'
import type { CreateReservationInput } from '@/reservation/reservationApi'

export type FormState = { time: string; type: MatchType; ranks: string[]; capacity: string; memo: string }



export const blankForm = (): FormState => ({ time: defaultStartTime(new Date()), type: '랭크매치', ranks: [], capacity: '1', memo: '' })

/** Reverse of the create mapping, so editing starts from what the host posted. */
export function toForm(reservation: Reservation): FormState {
  return {
    time: reservation.time,
    type: reservation.type,
    ranks: reservation.ranks,
    capacity: String(reservation.capacity),
    memo: reservation.memo,
  }
}

/** Everything the create/edit dialog needs, minus the rendering.
 *
 * The create modal doubles as the edit form — same fields, same validation —
 * so a rule cannot drift between posting and editing. Keeping `editingId` in
 * here with the values it belongs to is what makes that one form rather than
 * two that happen to look alike.
 */
export default function useReservationForm() {
  const [form, setForm] = useState<FormState>(blankForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [rankPickerOpen, setRankPickerOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [draftTime, setDraftTime] = useState(() => defaultStartTime(new Date()))

  const closePickers = () => { setRankPickerOpen(false); setTimePickerOpen(false) }

  const openCreate = () => {
    // Recomputed per open: a tab left sitting since morning would otherwise
    // still offer the hour that was next when the page loaded.
    setForm(blankForm())
    setEditingId(null)
    setOpen(true)
    closePickers()
  }

  const openEdit = (reservation: Reservation) => {
    setForm(toForm(reservation))
    setEditingId(reservation.id)
    setOpen(true)
    closePickers()
  }

  const close = () => { setOpen(false); setEditingId(null); closePickers() }

  const toggleRank = (rank: string) => {
    setForm((current) => ({
      ...current,
      ranks: sortRanksDescending(current.ranks.includes(rank)
        ? current.ranks.filter((selectedRank) => selectedRank !== rank)
        : [...current.ranks, rank]),
    }))
  }

  /** A rank match is always one-on-one, and a player match carries no ranks —
   * so the payload drops whichever field the chosen type does not use rather
   * than sending a value the form never showed. */
  const conditions = (): Omit<CreateReservationInput, 'display_name'> => ({
    start_time: `${form.time}:00`,
    ranks: form.type === '플레이어 매치' ? [] : form.ranks,
    match_type: matchTypeValues[form.type],
    capacity: form.type === '랭크매치' ? 1 : Number(form.capacity),
    memo: form.memo,
  })

  /** A rank match with no rank chosen is the one state the backend would reject
   * that the form can catch first. */
  const incomplete = form.type === '랭크매치' && form.ranks.length === 0
  const atRankCap = form.ranks.length >= MAX_RANKS

  return {
    form, setForm,
    editingId, isEditing: editingId !== null,
    open, openCreate, openEdit, close,
    rankPickerOpen, setRankPickerOpen,
    timePickerOpen, setTimePickerOpen,
    draftTime, setDraftTime,
    toggleRank, conditions, incomplete, atRankCap,
  }
}
