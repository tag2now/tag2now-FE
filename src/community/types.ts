// Community types
export interface PostSummary {
  id: number
  author: string
  title: string
  body: string
  post_type: string
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
  thumbs_up: number
  thumbs_down: number
  created_at: string
  comments: CommentOut[]
}