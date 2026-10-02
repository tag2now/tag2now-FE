import toast from 'react-hot-toast'
import { AppError } from '@/shared/util/AppError'

const kstDateTime = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' })

export const formatInstant = (iso: string | null) => (iso ? kstDateTime.format(new Date(iso)) : '기록 없음')

/** An action asked for with a field left empty: say so in a toast, and put the
 * cursor where the missing value goes. The buttons stay pressable on purpose ---
 * a dimmed button that does nothing when pressed explains nothing. */
export function warnEmpty(field: HTMLInputElement | null, message: string) {
  toast.error(message, { id: message })
  field?.focus()
}

/** The server's own sentence when it gave one, else a generic retry hint. */
export function errorText(error: unknown): string {
  if (error instanceof AppError && error.explained) return error.message
  return '요청하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'
}
