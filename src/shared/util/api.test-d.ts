import { expectTypeOf } from 'vitest'
import { DELETE, GET, PATCH, POST, PUT, request } from '@/shared/util/api'
import { createReservation } from '@/reservation/reservationApi'
import { thumbPost, updatePost } from '@/community/communityApi'
import type { PostSummary } from '@/community/types'

// Checked by tsc, not executed: protect public API types as well as runtime behavior.
expectTypeOf(GET('example')).toEqualTypeOf<Promise<unknown>>()
expectTypeOf(POST('example', {})).toEqualTypeOf<Promise<unknown>>()
expectTypeOf(PUT('example', {})).toEqualTypeOf<Promise<unknown>>()
expectTypeOf(PATCH('example', {})).toEqualTypeOf<Promise<unknown>>()
expectTypeOf(request('example', {})).toEqualTypeOf<Promise<unknown>>()
expectTypeOf(GET<{ id: number }>('example')).toEqualTypeOf<Promise<{ id: number }>>()
expectTypeOf(DELETE('example')).toEqualTypeOf<Promise<void>>()
expectTypeOf(DELETE<{ id: number }>('example')).toEqualTypeOf<Promise<{ id: number }>>()
expectTypeOf<ReturnType<typeof updatePost>>().toEqualTypeOf<Promise<PostSummary>>()

GET('example', { days: 7, online: false, name: 'Player' })
GET('example', new URLSearchParams([['characters', 'Jin'], ['characters', 'King']]))
POST('example', { title: 'Title', optional: undefined, characters: ['Jin'], video: null })

// @ts-expect-error Repeat query keys with URLSearchParams rather than array coercion.
GET('example', { characters: ['Jin', 'King'] })
// @ts-expect-error Objects are not scalar query values.
GET('example', { filter: { days: 7 } })
// @ts-expect-error Optional query values must be omitted, not serialized as undefined.
GET('example', { days: undefined })
// @ts-expect-error Request bodies must be JSON data, not callbacks.
POST('example', { callback: () => {} })
// @ts-expect-error Date objects must be converted to the endpoint's string format.
PUT('example', { start: new Date() })
// @ts-expect-error BigInt is not JSON serializable.
PATCH('example', { id: 1n })
// @ts-expect-error Feature API inputs retain their domain constraints.
createReservation({ start_time: '12:00', ranks: [], match_type: 'rank_match', capacity: '2', memo: '' })
// @ts-expect-error The vote direction is a closed set.
thumbPost(1, 'sideways')
