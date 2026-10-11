/** A Chzzk channel an account has connected. */
export interface StreamChannel {
  platform: string
  channel_id: string
  channel_name: string
  channel_url: string
  registered_at: string
}

export interface AdminStreamChannel extends StreamChannel {
  username: string
}
