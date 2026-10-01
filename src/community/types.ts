// Community types
export interface PostSummary {
  id: number
  author: string
  title: string
  body: string
  post_type: string
  characters: string[]
  youtube_video_id?: string | null
  thumbs_up: number
  thumbs_down: number
  created_at: string
  comment_count: number
}

export interface PostListResponse {
  posts: PostSummary[]
  total: number
  page: number
  page_size: number
}

export interface CommentOut {
  id: number
  post_id: number
  parent_id: number | null
  author: string
  body: string
  created_at: string
  replies: CommentOut[]
}

export interface PostDetail {
  id: number
  author: string
  title: string
  body: string
  post_type: string
  characters: string[]
  youtube_video_id?: string | null
  thumbs_up: number
  thumbs_down: number
  created_at: string
  comments: CommentOut[]
}

/**
 * What kind of post this is, mirroring VALID_POST_TYPES in the backend's
 * community/models.py. That set is the authority — it rejects anything else —
 * so adding a type here alone yields a 422 on submit.
 *
 * Characters are no longer among these. They used to be: the picker wrote a
 * character name into `post_type`, so tagging a post with Jin *replaced* its
 * category and no post could be both a 공략 and about a character. The backend
 * has carried a separate `characters` array all along — up to two of them,
 * which is what a tag-team pick needs — and this list is the category again. */
export const POST_TYPES = ['자유', '건의', '공략'] as const

/** Pinned above the board and on the home page, and left out of the board's
 * own list. Not among POST_TYPES: only an admin may write one (the backend
 * answers 403 otherwise), and the filter has nothing to narrow to — every
 * notice is already pinned above it. */
export const NOTICE_POST_TYPE = '공지'

/** What the write form offers: an admin can also post a notice. */
export const postTypesFor = (admin: boolean): readonly string[] =>
  admin ? [...POST_TYPES, NOTICE_POST_TYPE] : POST_TYPES

/** The one nobody has to choose. It is the backend's default for `post_type`,
 * which makes it the absence of a category rather than a category — so it is
 * not shown next to characters, where it would contradict them. */
export const DEFAULT_POST_TYPE = POST_TYPES[0]

/** The backend caps the array at two; a tag team is two characters. */
export const MAX_POST_CHARACTERS = 2
