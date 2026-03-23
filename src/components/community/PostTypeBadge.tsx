import { charImageUrl } from '@/shared/characterImage'

interface PostTypeBadgeProps {
  postType: string
  size?: 'sm' | 'md'
}

export default function PostTypeBadge({ postType, size = 'sm' }: PostTypeBadgeProps) {
  const url = charImageUrl(postType)
  const imgClass = size === 'md' ? 'h-6 w-6' : 'h-5 w-5'
  const textClass = size === 'md'
    ? 'text-[0.75rem] px-2 py-0.5'
    : 'text-[0.7rem] px-1.5 py-0.5'

  if (url) {
    return <img src={url} alt={postType} className={`${imgClass} object-cover rounded`} title={postType} />
  }

  return (
    <span className={`${textClass} font-bold uppercase tracking-wider bg-primary-dim text-primary rounded`}>
      {postType}
    </span>
  )
}
