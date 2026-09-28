import { useState, useEffect } from 'react'
import { GET} from "@/shared/util/api";
import { API } from "@/config/endpoints";
import type { HourlyActivity, DailySummary} from "@/stat/types";

export type StatsDays = 7 | 14 | 30 | 90

/** Two weeks, so a weekday reads against the same weekday before it rather
 * than against a single week that has nothing to compare it with. */
export const DEFAULT_STATS_DAYS: StatsDays = 14

interface StatsState {
  hourly: HourlyActivity[]
  daily: DailySummary[]
  loading: boolean
  error: string | null
  days: StatsDays
  setDays: (d: StatsDays) => void
}

export default function useStats(): StatsState {
  const [days, setDays] = useState<StatsDays>(DEFAULT_STATS_DAYS)
  const [hourly, setHourly] = useState<HourlyActivity[]>([])
  const [daily, setDaily] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      GET(API.stats().path, { days }),
      GET(API.dailyStats().path, { days }),
    ])
      .then(([h, d]) => {
        if (cancelled) return
        setHourly(h as HourlyActivity[])
        setDaily(d as DailySummary[])
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [days])

  return { hourly, daily, loading, error, days, setDays }
}
