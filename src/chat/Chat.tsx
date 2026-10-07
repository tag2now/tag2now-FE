import { useEffect, useRef, useState } from 'react'
import { setReading } from '@/chat/chatStream'
import useChatStream from '@/chat/useChatStream'
import { ChatLauncher, ChatPanel } from '@/chat/component'
import useMediaQuery from '@/shared/hooks/useMediaQuery'

/** Wide enough for the chat to stand as a third column beside the main one.
 * At 1350px the sidebar, 300px of chat and the gaps leave the main column
 * 796px, and the home page's rankings grid inside it the 762px its two cards
 * need to share a row (`.overview-grid.is-rankings`: 2 × 377 + 8). Measured,
 * not derived: the panel's frame takes 34px between the two. The grid follows
 * the DOM through `:has()`, so this is the only place the width is written. */
export const DOCKED_QUERY = '(min-width: 1350px)'

/** The lobby chat. On a wide screen it is a column to the right of the main
 * one, always open. Narrower, it folds into a launcher in the bottom-left
 * corner that opens it as a panel — a full-screen sheet on a phone.
 *
 * It is mounted once, inside the layout, and stays mounted while the reader
 * moves between tabs, so the stream is held for the whole visit and a closed
 * launcher can count what arrives. Reading it needs no account; writing does.
 */
export default function Chat() {
  const chat = useChatStream()
  const docked = useMediaQuery(DOCKED_QUERY)
  const [open, setOpen] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const closedByReader = useRef(false)

  useEffect(() => {
    setReading(docked || open)
    if (open || !closedByReader.current) return
    // The launcher is the control that opened the panel; put the reader back on it.
    closedByReader.current = false
    launcherRef.current?.focus()
  }, [docked, open])

  const close = () => {
    closedByReader.current = true
    setOpen(false)
  }

  if (docked) return <ChatPanel chat={chat} />
  if (open) return <ChatPanel chat={chat} onClose={close} />
  return <ChatLauncher ref={launcherRef} unread={chat.unread} onOpen={() => setOpen(true)} />
}
