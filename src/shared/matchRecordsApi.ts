import { GET } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import type { MatchRecordPage } from '@/shared/matchRecords'

/** Whose matches: one player's by id, or everyone's whose name contains `q`. */
export type MatchRecordFilter = { npid?: string; q?: string }

/** Matches newest first. The first page asks no `before`; an empty filter value is no filter. */
export function fetchMatchRecords(filter: MatchRecordFilter, before: number | null): Promise<MatchRecordPage> {
  const query: Record<string, string | number> = {}
  if (filter.npid) query.npid = filter.npid
  if (filter.q) query.q = filter.q
  if (before != null) query.before = before
  return GET<MatchRecordPage>(API.matchRecords().path, query)
}
