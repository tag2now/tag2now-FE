/** One line of the lobby chat, as the stream and `POST /chat/messages` send it.
 *
 * `author_username` is the RPCN id, and the only thing "is this mine?" compares;
 * `author_online_name` is for display.
 */
export type ChatMessage = {
  id: number
  author_username: string
  author_online_name: string
  body: string
  created_at: string
}

/** The longest message the backend accepts: `MAX_BODY_LENGTH` in tag2now-BE's
 * `chat/models.py`. Kept here rather than in `chatApi.ts` so a test that mocks
 * the API module still reads the real limit. */
export const MAX_BODY_LENGTH = 200
