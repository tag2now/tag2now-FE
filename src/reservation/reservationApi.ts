import { DELETE, GET, POST } from '@/shared/util/api'

export type ApiReservation = { id: number; start_at: string; duration_minutes: number; host_display_name: string; host_ranks: string[]; match_type: 'rank_match' | 'player_match'; capacity: number; memo: string; status: 'open' | 'matched'; participant_count: number }
const participantKey = (id: number) => `reservation-participant-${id}`

export const fetchReservations = (): Promise<ApiReservation[]> => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
  return GET('reservations', { date })
}
export async function createReservation(data: Record<string, unknown>) {
  const result = await POST('reservations', data)
  localStorage.setItem(`reservation-owner-${result.reservation.id}`, result.owner_token)
  return result.reservation as ApiReservation
}
export async function joinReservation(id: number, displayName: string) {
  const result = await POST(`reservations/${id}/participants`, { display_name: displayName, ranks: [] })
  localStorage.setItem(participantKey(id), result.participant_token)
  return result.reservation as ApiReservation
}
export async function cancelParticipation(id: number) {
  const token = localStorage.getItem(participantKey(id))
  if (!token) throw new Error('참가 취소 권한이 없습니다.')
  const result = await DELETE(`reservations/${id}/participants/me`, { 'X-Reservation-Token': token })
  localStorage.removeItem(participantKey(id))
  return result as ApiReservation
}
export const hasParticipation = (id: number) => localStorage.getItem(participantKey(id)) !== null
