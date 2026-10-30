import { GET } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import { POLL } from '@/config/polling'
import usePolledData, { type PolledState } from '@/shared/hooks/usePolledData'
import type { EventBoard, EventPlayer } from '@/event/types'

const fetchEventBoard = (): Promise<EventBoard> => GET(API.event().path)

export const fetchEventPlayer = (npid: string): Promise<EventPlayer> => GET(API.eventPlayer(npid).path)

export default function useEvent(): PolledState<EventBoard> {
  return usePolledData(fetchEventBoard, POLL.event)
}
