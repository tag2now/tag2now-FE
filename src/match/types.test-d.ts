import { expectTypeOf } from 'vitest'
import type { RankMatchRoom, Room, RoomGroups, RoomsResponse } from '@/match/types'

// tsc checks that rank metadata survives the API-to-UI boundary without an assertion.
expectTypeOf<RoomGroups['rank_match']>().toEqualTypeOf<RankMatchRoom[] | undefined>()
expectTypeOf<RoomGroups['player_match']>().toEqualTypeOf<Room[]>()

const rank = { id: 1, name: '1st dan', tier: '나무단' }
const groups: RoomGroups = {
  rank_match: [{ room_id: 1, rank_info: rank, users: [] }],
  player_match: [{ room_id: 2, rank_info: null, users: [] }],
  custom_mode: [{ room_id: 3, users: [] }],
}
const response: RoomsResponse = { rank_match: [{ room_id: 1, rank_info: rank, users: [] }] }

// @ts-expect-error The rank-match renderer requires rank metadata.
groups.rank_match = [{ room_id: 1, users: [] }]
// @ts-expect-error A null rank describes a player room, not a rank match.
groups.rank_match = [{ room_id: 1, rank_info: null, users: [] }]
// @ts-expect-error The backend contract supplies rank metadata for rank matches too.
response.rank_match = [{ room_id: 1, users: [] }]
