import { useState, useEffect } from 'react'
import { GET} from "@/shared/util/api";
import { API } from "@/config/endpoints";
import type { HourlyActivity, DailySummary} from "@/stat/types";
import { completedDays } from "@/stat/completedDays";

export type StatsDays = 7 | 30 | 90

interface StatsState {
  hourly: HourlyActivity[]
  daily: DailySummary[]
  loading: boolean
  error: string | null
  days: StatsDays
  setDays: (d: StatsDays) => void
}

export default function useStats(): StatsState {
  const [days, setDays] = useState<StatsDays>(7)
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
        // Charted days only, so the day still being counted does not read as a
        // collapse at the end of the line. The overview's "오늘 접속자" card
        // reads the same endpoint through useOverview and keeps today, which is
        // the figure it is about --- so this is cut here rather than in the
        // shared DailyChart or in the API layer.
        setDaily(completedDays(d as DailySummary[]))
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
