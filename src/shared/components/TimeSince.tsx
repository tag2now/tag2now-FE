import useTimeSince from '@/shared/hooks/useTimeSince'

interface TimeSinceProps {
  date?: Date | null
}

export default function TimeSince({ date }: TimeSinceProps) {
  const updatedAgo = useTimeSince(date)

  return updatedAgo ? (
    <span className="text-xs text-txt-dim">업데이트 {updatedAgo}</span>
  ) : null
}
