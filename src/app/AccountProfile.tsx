import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import useAuth from '@/auth/useAuth'
import useConfirm from '@/shared/hooks/useConfirm'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import PlayerProfileCard from '@/shared/components/PlayerProfileCard'
import StreamChannelDialog from '@/streaming/StreamChannelDialog'
import AccountControl from '@/app/AccountControl'
import type { RoomUser } from '@/match/types'
import type { CharInfo, LeaderboardEntry } from '@/shared/types'

interface AccountProfileProps {
  leaderboardEntries?: LeaderboardEntry[]
  roomUsers?: RoomUser[]
}

/** Connect the signed-in account to its header control, profile and dialogs. */
export default function AccountProfile({ leaderboardEntries, roomUsers = [] }: AccountProfileProps) {
  const { user, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [streamOpen, setStreamOpen] = useState(false)
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)
  const { confirm, request: confirmRequest, onConfirm, onCancel } = useConfirm()

  useEffect(() => {
    setHeaderTarget(document.getElementById('headerProfileSlot'))
  }, [])

  // A record open for the last account must not stay open for no account.
  useEffect(() => {
    if (!user) { setProfileOpen(false); setStreamOpen(false) }
  }, [user])

  const entry = user
    ? leaderboardEntries?.find(item => item.np_id === user.username)
    : undefined
  const characters = [entry?.player_info?.main_char_info, entry?.player_info?.sub_char_info]
    .filter((character): character is CharInfo => !!character?.name)
  const online = !!user && roomUsers.some(roomUser => roomUser.np_id === user.username)

  const confirmLogout = async () => {
    const agreed = await confirm({
      title: '로그아웃할까요?',
      body: '다시 로그인하려면 RPCN 비밀번호를 입력해야 합니다.',
      confirmLabel: '로그아웃',
      tone: 'default',
    })
    if (agreed) logout()
  }

  return (
    <>
      {user && (
        <PlayerProfileCard
          name={user.online_name || user.username}
          rank={entry?.rank}
          characters={characters}
          online={online}
          onOpenHistory={entry ? () => setProfileOpen(true) : undefined}
        />
      )}
      {headerTarget && createPortal(
        <AccountControl
          user={user}
          entry={entry}
          characters={characters}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenStream={() => setStreamOpen(true)}
          onLogout={confirmLogout}
        />,
        headerTarget,
      )}
      {profileOpen && entry && createPortal(
        <PlayerHistoryPanel
          npid={entry.np_id}
          leaderboardEntry={entry}
          onClose={() => setProfileOpen(false)}
        />,
        document.body,
      )}
      {streamOpen && createPortal(<StreamChannelDialog onClose={() => setStreamOpen(false)} />, document.body)}
      {confirmRequest && createPortal(
        <ConfirmDialog request={confirmRequest} onConfirm={onConfirm} onCancel={onCancel} />,
        document.body,
      )}
    </>
  )
}
