import { GET, POST, PATCH, DELETE } from '@/shared/util/api'
import {PostDetail, PostListResponse} from "@/community/types";

export const setIdentity = (name: string) =>
  POST('community/identity', { name })

export const fetchPosts = (page: number, pageSize: number, postType?: string): Promise<PostListResponse> => {
  const params: Record<string, string> = { page: String(page), page_size: String(pageSize) }
  if (postType) params.post_type = postType
  return GET('community/posts', params)
}

export const fetchPostDetail = (postId: number): Promise<PostDetail> =>
  GET(`community/posts/${postId}`)

export const createPost = (title: string, body: string, postType: string, youtubeVideoId?: string) =>
  POST('community/posts', { title, body, post_type: postType, ...(youtubeVideoId && { youtube_video_id: youtubeVideoId }) })

export const updatePost = (postId: number, title: string, body: string, postType: string, youtubeVideoId?: string) =>
  PATCH(`community/posts/${postId}`, { title, body, post_type: postType, youtube_video_id: youtubeVideoId ?? null })

export const deletePost = (postId: number) =>
  DELETE(`community/posts/${postId}`)

export const createComment = (postId: number, body: string, parentId?: number) =>
  POST(`community/posts/${postId}/comments`, { body, ...(parentId != null && { parent_id: parentId }) })

export const thumbPost = (postId: number, direction: 'up' | 'down') =>
  POST(`community/posts/${postId}/thumb`, { direction })
