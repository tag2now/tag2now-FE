import { DELETE, GET, PATCH, POST } from '@/shared/util/api'
import { AppError } from '@/shared/util/AppError'

export type ApiReservation = { id: number; start_at: string; duration_minutes: number; host_display_name: string; host_ranks: string[]; match_type: 'rank_match' | 'player_match' | 'any'; capacity: number; memo: string; status: 'open' | 'matched' | 'cancelled' | 'ended'; participant_count: number; created_at: string }
export type CreateReservationInput = { start_time: string; duration_minutes: number; display_name: string; ranks: string[]; match_type: 'rank_match' | 'player_match' | 'any'; capacity: number; memo: string }
const participantKey = (id: number) => `reservation-participant-${id}`
const ownerKey = (id: number) => `reservation-owner-${id}`

export const fetchReservations = (): Promise<ApiReservation[]> => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
  return GET('reservations', { date })
}
export async function createReservation(data: CreateReservationInput) {
  const result = await POST('reservations', data)
  localStorage.setItem(ownerKey(result.reservation.id), result.owner_token)
  return result.reservation as ApiReservation
}
export async function joinReservation(id: number, displayName: string) {
  const result = await POST(`reservations/${id}/participants`, { display_name: displayName, ranks: [] })
  localStorage.setItem(participantKey(id), result.participant_token)
  return result.reservation as ApiReservation
}
export async function cancelParticipation(id: number) {
  const token = localStorage.getItem(participantKey(id))
  if (!token) throw new AppError('참가 취소 권한이 없습니다.')
  const result = await DELETE(`reservations/${id}/participants/me`, { 'X-Reservation-Token': token })
  localStorage.removeItem(participantKey(id))
  return result as ApiReservation
}
export type UpdateReservationInput = Partial<Pick<CreateReservationInput, 'start_time' | 'duration_minutes' | 'ranks' | 'match_type' | 'capacity' | 'memo'>>

export async function updateReservation(id: number, patch: UpdateReservationInput) {
  const token = localStorage.getItem(ownerKey(id))
  if (!token) throw new AppError('예약을 수정할 권한이 없습니다.')
  return await PATCH(`reservations/${id}`, patch, { 'X-Reservation-Token': token }) as ApiReservation
}

export async function cancelReservation(id: number) {
  const token = localStorage.getItem(ownerKey(id))
  if (!token) throw new AppError('예약을 삭제할 권한이 없습니다.')
  await DELETE(`reservations/${id}`, { 'X-Reservation-Token': token })
  localStorage.removeItem(ownerKey(id))
}
export const hasParticipation = (id: number) => localStorage.getItem(participantKey(id)) !== null
export const isOwner = (id: number) => localStorage.getItem(ownerKey(id)) !== null
