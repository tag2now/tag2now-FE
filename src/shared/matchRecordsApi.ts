import { GET } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import type { MatchRecordPage, PlayerRecordPage } from '@/shared/matchRecords'

/** The first page asks no `before`; an empty `q` is no filter. */
function recordQuery(before: number | null, q = ''): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (before != null) query.before = before
  if (q) query.q = q
  return query
}

/** Everyone's matches, newest first; `q` keeps those with a player whose name contains it. */
export const fetchMatchRecords = (q: string, before: number | null): Promise<MatchRecordPage> =>
  GET<MatchRecordPage>(API.matchRecords().path, recordQuery(before, q))

export const fetchPlayerRecords = (npid: string, before: number | null): Promise<PlayerRecordPage> =>
  GET<PlayerRecordPage>(API.playerRecords(npid).path, recordQuery(before))
