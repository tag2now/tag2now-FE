import { GET } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import type { PlayerSave } from '@/shared/saveChars'

/** Anyone's TTT2 save. Rejects with a 404 AppError when there is none. */
export const fetchPlayerSave = (npid: string): Promise<PlayerSave> => GET(API.playerSave(npid).path)
