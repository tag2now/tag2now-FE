/** How many `--color-chat-name-*` tokens tokens.css declares. */
export const NAME_TONES = 12

/** Which name colour an account wears in the chat: a hash of its RPCN id, so
 * it is the same on every line, every visit and every reader's screen, with
 * nothing stored. FNV-1a, which spreads ids that differ by one letter. */
export function nameTone(username: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < username.length; i += 1) {
    hash ^= username.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % NAME_TONES
}
