import { fetchLeaderboard } from '../api'
import usePolledData from './usePolledData'

const fetchLb = () => fetchLeaderboard(100)

export default function useLeaderboard() {
  return usePolledData(fetchLb, null)
}
