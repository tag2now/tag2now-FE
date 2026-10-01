import { AppError } from '@/shared/util/AppError'

const kstDateTime = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' })

export const formatInstant = (iso: string | null) => (iso ? kstDateTime.format(new Date(iso)) : '기록 없음')

/** The server's own sentence when it gave one, else a generic retry hint. */
export function errorText(error: unknown): string {
  if (error instanceof AppError && error.explained) return error.message
  return '요청하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'
}
