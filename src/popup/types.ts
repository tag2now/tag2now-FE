/** A message admins show visitors when they open the site. */
export interface Popup {
  id: number
  title: string
  body: string
  /** Relative to the API root; null when the popup has no image. */
  image_path: string | null
  allow_dismiss_forever: boolean
  allow_dismiss_day: boolean
}

export interface AdminPopup extends Popup {
  active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

/** What the admin form submits. */
export interface PopupDraft {
  title: string
  body: string
  allow_dismiss_forever: boolean
  allow_dismiss_day: boolean
  active: boolean
  /** A new image; null keeps what is stored. */
  image: File | null
  remove_image: boolean
}
