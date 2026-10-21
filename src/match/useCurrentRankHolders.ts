import { useEffect, useState } from 'react'
import { GET } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import type { PlayerSave } from '@/shared/saveChars'
import { UNEXPLAINED } from '@/shared/util/panelStatus'
import type { CurrentRankHolders } from '@/match/types'

/** 1st dan: the floor has raised every save to it, so the backend asks no lower. */
export const MIN_HOLDER_RANK = 10

export const fetchCurrentRankHolders = (rank: number): Promise<CurrentRankHolders> =>
  GET(API.currentRankHolders().path, { rank })

export type HoldersState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded', holders: CurrentRankHolders }
  | { kind: 'failed', message: string }

/** Asked once per rank chosen, not polled: the backend holds the answer for
 * five minutes, and who is in a room now comes from App's own rooms poll. */
export default function useCurrentRankHolders(rank: number | null): { state: HoldersState, retry: () => void } {
  const [state, setState] = useState<HoldersState>({ kind: 'idle' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (rank === null) {
      setState({ kind: 'idle' })
      return
    }
    // A slower answer for the rank chosen before must not land over this one.
    let cancelled = false
    setState({ kind: 'loading' })
    fetchCurrentRankHolders(rank)
      .then((holders) => { if (!cancelled) setState({ kind: 'loaded', holders }) })
      .catch((error: unknown) => {
        if (!cancelled) setState({ kind: 'failed', message: error instanceof Error ? error.message : UNEXPLAINED })
      })
    return () => { cancelled = true }
  }, [rank, attempt])

  return { state, retry: () => setAttempt((n) => n + 1) }
}

/** The highest rank a player has played a character at, from 1st dan up; null when none. */
export function bestPlayedRank(save: PlayerSave): number | null {
  const ranks = save.chars
    .filter((c) => c.wins + c.losses > 0 && c.rank >= MIN_HOLDER_RANK)
    .map((c) => c.rank)
  return ranks.length > 0 ? Math.max(...ranks) : null
}

/** The rank the signed-in player's finder opens on; null while signed out, while
 * loading, or for a player with no save to read it from. */
export function useOwnPlayedRank(username: string | undefined): number | null {
  const [rank, setRank] = useState<number | null>(null)

  useEffect(() => {
    setRank(null)
    if (!username) return
    let cancelled = false
    fetchPlayerSave(username)
      .then((save) => { if (!cancelled) setRank(bestPlayedRank(save)) })
      // No save, or none readable: the finder simply opens with no rank chosen.
      .catch(() => {})
    return () => { cancelled = true }
  }, [username])

  return rank
}
