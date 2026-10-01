import { GET, POST, PATCH, DELETE } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import { NOTICE_POST_TYPE, type PostDetail, type PostListResponse, type PostSummary } from "@/community/types";

export const fetchPosts = (page: number, pageSize: number, postType?: string, characters: string[] = []): Promise<PostListResponse> => {
  // URLSearchParams repeats a key for each array entry, which is the shape
  // FastAPI reads a `list[str]` query parameter from.
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (postType) params.set('post_type', postType)
  characters.forEach((name) => params.append('characters', name))
  return GET(API.posts().path, params)
}

/** The backend's page_size cap. Every notice is pinned, and there are a handful
 * at most, so one page is all of them. */
const NOTICE_LIMIT = 100

/** Newest first. The board's own list leaves notices out, so they come from here. */
export const fetchNotices = (limit = NOTICE_LIMIT): Promise<PostSummary[]> =>
  fetchPosts(1, limit, NOTICE_POST_TYPE).then((res) => res.posts)

export const fetchPostDetail =(postId: number): Promise<PostDetail> =>
  GET(API.post(postId).path)

export interface PostInput {
  title: string
  body: string
  postType: string
  /** Up to two; the backend rejects a third. */
  characters: string[]
  youtubeVideoId?: string
}

export const createPost = ({ title, body, postType, characters, youtubeVideoId }: PostInput) =>
  POST(API.posts().path, {
    title, body, post_type: postType, characters,
    ...(youtubeVideoId && { youtube_video_id: youtubeVideoId }),
  })

/** PATCH requires every field, so an omitted one is not "leave it alone" — it
 * is a 422. Both nullable fields are therefore always sent. */
export const updatePost = (postId: number, { title, body, postType, characters, youtubeVideoId }: PostInput) =>
  PATCH(API.post(postId).path, {
    title, body, post_type: postType, characters,
    youtube_video_id: youtubeVideoId ?? null,
  })

export const deletePost = (postId: number) =>
  DELETE(API.post(postId).path)

export const createComment = (postId: number, body: string, parentId?: number) =>
  POST(API.postComments(postId).path, { body, ...(parentId != null && { parent_id: parentId }) })

export const thumbPost = (postId: number, direction: 'up' | 'down') =>
  POST(API.postThumb(postId).path, { direction })
