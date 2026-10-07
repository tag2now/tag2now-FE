import { API } from '@/config/endpoints'
import { apiUrl, DELETE, POST } from '@/shared/util/api'
import type { ChatMessage } from '@/chat/types'

/** Where the EventSource connects. The stream is public, which matters: an
 * EventSource cannot send an Authorization header. */
export const streamUrl = (): string => apiUrl(API.chatStream().path)

export const postMessage = (body: string): Promise<ChatMessage> =>
  POST(API.chatMessages().path, { body })

export const deleteMessage = (id: number): Promise<void> =>
  DELETE(API.chatMessage(id).path)
