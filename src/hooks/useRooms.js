import { fetchRoomsAll } from '../api'
import usePolledData from './usePolledData'

const ROOMS_REFRESH_INTERVAL = 10_000

export default function useRooms() {
  return usePolledData(fetchRoomsAll, ROOMS_REFRESH_INTERVAL)
}
