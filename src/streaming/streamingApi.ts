import { DELETE, GET, PUT } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import type { AdminStreamChannel, StreamChannel } from '@/streaming/types'

/** The signed-in account's channel, or null when none is connected. */
export const getMyChannel = async (): Promise<StreamChannel | null> =>
  (await GET(API.myStream().path)).channel

/** Connect a channel by its chzzk.naver.com address or bare id, replacing any before it. */
export const registerChannel = async (channel: string): Promise<StreamChannel> =>
  (await PUT(API.myStream().path, { channel })).channel

export const unregisterChannel = (): Promise<void> => DELETE(API.myStream().path)

export const listChannels = async (): Promise<AdminStreamChannel[]> =>
  (await GET(API.adminStreams().path)).channels

export const removeChannel = (username: string): Promise<void> => DELETE(API.adminStream(username).path)
