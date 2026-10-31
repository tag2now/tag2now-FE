import { DELETE, GET, request } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import type { AdminPopup, Popup, PopupDraft } from '@/popup/types'

/** No Content-Type here: the browser writes the multipart boundary itself. */
const multipart = (method: 'POST' | 'PUT', draft: PopupDraft): RequestInit => {
  const form = new FormData()
  form.set('title', draft.title)
  form.set('body', draft.body)
  form.set('allow_dismiss_forever', String(draft.allow_dismiss_forever))
  form.set('allow_dismiss_day', String(draft.allow_dismiss_day))
  form.set('active', String(draft.active))
  if (draft.image) form.set('image', draft.image)
  if (method === 'PUT') form.set('remove_image', String(draft.remove_image))
  return { method, body: form }
}

export const getActivePopups = async (): Promise<Popup[]> =>
  (await GET<{ popups: Popup[] }>(API.activePopups().path)).popups

export const listPopups = async (): Promise<AdminPopup[]> =>
  (await GET<{ popups: AdminPopup[] }>(API.adminPopups().path)).popups

export const createPopup = (draft: PopupDraft): Promise<AdminPopup> =>
  request<AdminPopup>(API.adminPopups().path, multipart('POST', draft))

export const updatePopup = (id: number, draft: PopupDraft): Promise<AdminPopup> =>
  request<AdminPopup>(API.adminPopup(id).path, multipart('PUT', draft))

export const deletePopup = (id: number): Promise<void> => DELETE(API.adminPopup(id).path)
