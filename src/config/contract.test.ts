import { describe, expect, it } from 'vitest'
import specJson from './openapi.json'

/** What this frontend assumes about tag2now-BE, checked against what it publishes.
 *
 * The two repositories share no schema and no codegen. Our unit tests mock
 * reservationApi away, and our e2e mocks answer with whatever we already
 * believed, so nothing else here can notice that the backend renamed a field.
 * openapi.json is a copy of the schema tag2now-BE commits, and CI fails when
 * the copy goes stale -- so a rename lands here as a red test rather than in
 * production.
 *
 * Refresh the copy with:
 *   curl -sSfo src/config/openapi.json https://raw.githubusercontent.com/tag2now/tag2now-BE/master/openapi.json
 */

type SchemaLike = { $ref?: string, items?: SchemaLike, properties?: Record<string, unknown> }

type Operation = {
  parameters?: { name: string, in: string }[]
  requestBody?: { content: Record<string, { schema: SchemaLike }> }
  responses: Record<string, { content?: Record<string, { schema: SchemaLike }> }>
}

type Spec = {
  paths: Record<string, Record<string, Operation>>
  components: { schemas: Record<string, { properties?: Record<string, unknown> }> }
}

const spec = specJson as unknown as Spec

type Expectation = {
  method: 'get' | 'post' | 'patch' | 'delete'
  path: string
  /** Query parameters this frontend sends. */
  query?: string[]
  /** Request body fields this frontend sends. */
  body?: string[]
  /** Headers this frontend sends. */
  headers?: string[]
  /** Response fields this frontend reads or types. */
  reads?: string[]
}

const RESERVATION = ['id', 'start_at', 'host_display_name', 'host_ranks', 'match_type', 'capacity', 'memo', 'status', 'participant_count', 'created_at']
const COMMENT = ['id', 'reservation_id', 'author', 'body', 'created_at']

/** Every endpoint the API modules and hooks actually call. */
const CONTRACT: Expectation[] = [
  { method: 'get', path: '/rooms/all' },
  { method: 'get', path: '/leaderboard', query: ['top'] },
  { method: 'get', path: '/history/stats', query: ['days'] },
  { method: 'get', path: '/history/stats/daily', query: ['days'] },
  { method: 'get', path: '/history/stats/weekly-top', query: ['limit'] },
  { method: 'get', path: '/history/players/{npid}' },

  { method: 'post', path: '/community/identity', body: ['name'] },
  { method: 'get', path: '/community/posts', query: ['page', 'page_size', 'post_type'] },
  { method: 'post', path: '/community/posts', body: ['title', 'body', 'post_type'] },
  { method: 'get', path: '/community/posts/{post_id}' },
  { method: 'delete', path: '/community/posts/{post_id}' },
  { method: 'post', path: '/community/posts/{post_id}/comments', body: ['body', 'parent_id'] },
  { method: 'post', path: '/community/posts/{post_id}/thumb', body: ['direction'] },

  { method: 'get', path: '/reservations', reads: RESERVATION },
  { method: 'post', path: '/reservations', body: ['start_time', 'display_name', 'ranks', 'match_type', 'capacity', 'memo'], reads: ['reservation', 'owner_token'] },
  { method: 'patch', path: '/reservations/{reservation_id}', body: ['start_time', 'ranks', 'match_type', 'capacity', 'memo'], headers: ['x-reservation-token'], reads: RESERVATION },
  { method: 'delete', path: '/reservations/{reservation_id}', headers: ['x-reservation-token'] },
  { method: 'post', path: '/reservations/{reservation_id}/participants', body: ['display_name', 'ranks'], reads: ['reservation', 'participant_token'] },
  { method: 'delete', path: '/reservations/{reservation_id}/participants/me', headers: ['x-reservation-token'], reads: RESERVATION },
  { method: 'get', path: '/reservations/{reservation_id}/comments', reads: COMMENT },
  { method: 'post', path: '/reservations/{reservation_id}/comments', body: ['display_name', 'body'], reads: ['comment', 'author_token'] },
  { method: 'delete', path: '/reservations/{reservation_id}/comments/{comment_id}', headers: ['x-reservation-token'] },
]

const name = ({ method, path }: Expectation) => `${method.toUpperCase()} ${path}`

const operation = (expectation: Expectation): Operation => {
  const found = spec.paths[expectation.path]?.[expectation.method]
  if (!found) throw new Error(`the contract declares no ${name(expectation)}`)
  return found
}

/** Property names of a schema, following one $ref and unwrapping one array. */
const fieldsOf = (schema?: SchemaLike): string[] => {
  const target = schema?.items ?? schema
  const referenced = target?.$ref?.split('/').pop()
  if (referenced) return Object.keys(spec.components.schemas[referenced]?.properties ?? {})
  return Object.keys(target?.properties ?? {})
}

const jsonResponse = (operation: Operation) =>
  Object.entries(operation.responses).find(([code]) => code.startsWith('2'))?.[1].content?.['application/json']?.schema

const parameters = (operation: Operation, location: string) =>
  (operation.parameters ?? []).filter((parameter) => parameter.in === location).map((parameter) => parameter.name)

const requestFields = (operation: Operation) => fieldsOf(operation.requestBody?.content['application/json']?.schema)

const declaring = (key: keyof Expectation) => CONTRACT.filter((expectation) => expectation[key])

describe('the API contract tag2now-BE publishes', () => {
  it.each(CONTRACT)('declares $method $path', (expectation) => {
    expect(() => operation(expectation)).not.toThrow()
  })

  it.each(declaring('headers'))('accepts the headers we send on $method $path', (expectation) => {
    expect(parameters(operation(expectation), 'header')).toEqual(expect.arrayContaining(expectation.headers!))
  })

  it.each(declaring('query'))('accepts the query parameters we send on $method $path', (expectation) => {
    expect(parameters(operation(expectation), 'query')).toEqual(expect.arrayContaining(expectation.query!))
  })

  it.each(declaring('body'))('accepts the request fields we send on $method $path', (expectation) => {
    expect(requestFields(operation(expectation))).toEqual(expect.arrayContaining(expectation.body!))
  })

  it.each(declaring('reads'))('returns the fields we read from $method $path', (expectation) => {
    expect(fieldsOf(jsonResponse(operation(expectation)))).toEqual(expect.arrayContaining(expectation.reads!))
  })
})

/** Calls whose route carries no response_model, so the schema is {} and nothing
 *  above can check their payloads. Shrinking this list is what would take the
 *  contract from covering half this frontend's calls to covering all of them. */
const NO_RESPONSE_MODEL = [
  'GET /rooms/all',
  'GET /leaderboard',
  'GET /history/stats',
  'GET /history/stats/daily',
  'GET /history/stats/weekly-top',
  'GET /history/players/{npid}',
  'POST /community/identity',
  'POST /community/posts',
  'POST /community/posts/{post_id}/comments',
  'POST /community/posts/{post_id}/thumb',
]

describe('the part of the contract that describes nothing', () => {
  it('is exactly the calls known to lack a response model', () => {
    const undescribed = CONTRACT
      .filter((expectation) => Object.keys(jsonResponse(operation(expectation)) ?? { absent: true }).length === 0)
      .map(name)
    expect(undescribed).toEqual(NO_RESPONSE_MODEL)
  })
})
