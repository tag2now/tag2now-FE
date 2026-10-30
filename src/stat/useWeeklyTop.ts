import { useState, useEffect } from 'react'
import { GET} from "@/shared/util/api";
import { API } from "@/config/endpoints";
import type { WeeklyTopPlayer } from '@/shared/activityTypes'

export type WeeklyTopLimit = 10 | 25 | 50

interface WeeklyTopState {
  data: WeeklyTopPlayer[]
  loading: boolean
  error: string | null
  limit: WeeklyTopLimit
  setLimit: (l: WeeklyTopLimit) => void
}

export default function useWeeklyTop(): WeeklyTopState {
  const [limit, setLimit] = useState<WeeklyTopLimit>(25)
  const [data, setData] = useState<WeeklyTopPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    GET<WeeklyTopPlayer[]>(API.weeklyTop().path, { limit })
      .then((res) => {
        if (cancelled) return
        setData(res)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [limit])

  return { data, loading, error, limit, setLimit }
}
