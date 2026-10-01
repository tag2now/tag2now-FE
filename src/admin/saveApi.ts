import { POST } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import type { SaveAuditRecord, SaveBackup, SaveEdit, SaveInfo, SaveWriteResult } from '@/admin/types'

/* Like the account calls, every one carries the admin's own password. */

const EDIT_PATHS: Record<SaveEdit['action'], () => string> = {
  'set-rank': () => API.adminSaveSetRank().path,
  'set-account-rank': () => API.adminSaveSetAccountRank().path,
  floor: () => API.adminSaveFloor().path,
  restore: () => API.adminSaveRestore().path,
}

/** Every character slot, so any of them can be picked for an edit. */
export const fetchSave = (username: string, password: string): Promise<SaveInfo> =>
  POST(API.adminSaveShow().path, { username, password, all_chars: true })

export const fetchSaveBackups = async (username: string, password: string): Promise<SaveBackup[]> =>
  ((await POST(API.adminSaveBackups().path, { username, password })) as { backups: SaveBackup[] }).backups

export const fetchSaveLog = async (username: string, password: string, n = 20): Promise<SaveAuditRecord[]> =>
  ((await POST(API.adminSaveLog().path, { username, password, n })) as { records: SaveAuditRecord[] }).records

/** A preview when `expectSha256` is null; otherwise the write, which the server
 * refuses if the save no longer has that sha256. */
export function editSave(username: string, password: string, edit: SaveEdit, expectSha256: string | null): Promise<SaveWriteResult> {
  const { action, ...fields } = edit
  const mode = expectSha256 === null ? { dry_run: true } : { expect_sha256: expectSha256 }
  return POST(EDIT_PATHS[action](), { username, password, ...fields, ...mode })
}
