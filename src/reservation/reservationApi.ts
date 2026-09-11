import { DELETE, GET, PATCH, POST } from '@/shared/util/api'
import { AppError } from '@/shared/util/AppError'

export type ApiParticipant = { id: number; display_name: string }
export type ApiReservation = { id: number; start_at: string; host_display_name: string; host_ranks: string[]; match_type: 'rank_match' | 'player_match' | 'any'; capacity: number; memo: string; status: 'open' | 'matched' | 'cancelled' | 'ended'; participant_count: number; participants?: ApiParticipant[]; created_at: string }
export type CreateReservationInput = { start_time: string; display_name: string; ranks: string[]; match_type: 'rank_match' | 'player_match' | 'any'; capacity: number; memo: string }
export type ApiComment = { id: number; reservation_id: number; author: string; body: string; created_at: string }
const participantKey = (id: number) => `reservation-participant-${id}`
const commentKey = (id: number) => `reservation-comment-${id}`
const ownerKey = (id: number) => `reservation-owner-${id}`

// The window is the server's to decide — now until the next 06:00 KST — so the
// client no longer names a date. A session that runs past midnight stays on one list.
export const fetchReservations = (): Promise<ApiReservation[]> => GET('reservations')
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
export type UpdateReservationInput = Partial<Pick<CreateReservationInput, 'start_time' | 'ranks' | 'match_type' | 'capacity' | 'memo'>>

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

export const fetchComments = (id: number): Promise<ApiComment[]> => GET(`reservations/${id}/comments`)

export async function createComment(id: number, displayName: string, body: string) {
  const result = await POST(`reservations/${id}/comments`, { display_name: displayName, body })
  localStorage.setItem(commentKey(result.comment.id), result.author_token)
  return result.comment as ApiComment
}

export async function deleteComment(reservationId: number, commentId: number) {
  const token = localStorage.getItem(commentKey(commentId))
  if (!token) throw new AppError('댓글을 삭제할 권한이 없습니다.')
  await DELETE(`reservations/${reservationId}/comments/${commentId}`, { 'X-Reservation-Token': token })
  localStorage.removeItem(commentKey(commentId))
}

/** Authorship is possession of the token this browser was handed when it posted. */
export const isCommentAuthor = (commentId: number) => localStorage.getItem(commentKey(commentId)) !== null
