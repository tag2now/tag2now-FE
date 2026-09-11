import { ExternalLink, Video } from 'lucide-react'
import { isYouTubeVideoId } from '@/community/youtube'

export default function YouTubeVideo({ videoId }: { videoId: string }) {
  if (!isYouTubeVideoId(videoId)) return null

  return (
    <section className="youtube-video" aria-label="첨부된 YouTube 영상">
      <div className="youtube-video-heading"><Video size={16} aria-hidden="true" /> YouTube</div>
      <iframe
        key={videoId}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1`}
        title="첨부된 YouTube 영상 플레이어"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      <div className="youtube-video-footer">
        <span>재생되지 않으면 YouTube에서 확인해 주세요.</span>
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">
          YouTube에서 보기 <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
