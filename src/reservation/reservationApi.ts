import { DELETE, GET, PATCH, POST } from '@/shared/util/api'
import { API } from '@/config/endpoints'

/** Every write here needs a signed-in user; `api.ts` attaches the token. The
 * host, participants and comment authors are that user --- the requests name
 * nobody. `*_username` fields are the RPCN id, compared against the signed-in
 * user's to answer "is this mine?"; they are null on rows from before login. */
export type ApiParticipant = { id: number; display_name: string; username: string | null }
export type ApiReservation = { id: number; start_at: string; host_display_name: string; host_username: string | null; host_ranks: string[]; match_type: 'rank_match' | 'player_match' | 'any'; capacity: number; memo: string; status: 'open' | 'matched' | 'cancelled' | 'ended'; participant_count: number; participants?: ApiParticipant[]; created_at: string }
export type CreateReservationInput = { start_time: string; ranks: string[]; match_type: 'rank_match' | 'player_match' | 'any'; capacity: number; memo: string }
export type ApiComment = { id: number; reservation_id: number; author: string; author_username: string | null; body: string; created_at: string }

// The window is the server's to decide — now until the next 06:00 KST — so the
// client no longer names a date. A session that runs past midnight stays on one list.
export const fetchReservations = (): Promise<ApiReservation[]> => GET(API.reservations().path)

export const createReservation = (data: CreateReservationInput): Promise<ApiReservation> =>
  POST(API.reservations().path, data)

export const joinReservation = (id: number): Promise<ApiReservation> =>
  POST(API.reservationParticipants(id).path, { ranks: [] })

export const cancelParticipation = (id: number): Promise<ApiReservation> =>
  DELETE(API.ownParticipation(id).path)

export type UpdateReservationInput = Partial<CreateReservationInput>

export const updateReservation = (id: number, patch: UpdateReservationInput): Promise<ApiReservation> =>
  PATCH(API.reservation(id).path, patch)

export async function cancelReservation(id: number): Promise<void> {
  await DELETE(API.reservation(id).path)
}

export const fetchComments = (id: number): Promise<ApiComment[]> => GET(API.reservationComments(id).path)

export const createComment = (id: number, body: string): Promise<ApiComment> =>
  POST(API.reservationComments(id).path, { body })

export async function deleteComment(reservationId: number, commentId: number): Promise<void> {
  await DELETE(API.reservationComment(reservationId, commentId).path)
}
