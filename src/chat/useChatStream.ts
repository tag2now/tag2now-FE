import { useSyncExternalStore } from 'react'
import { getChatState, subscribe, type ChatState } from '@/chat/chatStream'

/** The lobby chat as it stands. Mounting the first reader opens the stream. */
export default function useChatStream(): ChatState {
  return useSyncExternalStore(subscribe, getChatState)
}
