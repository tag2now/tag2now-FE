import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { postPath } from '@/config/routes'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import type { PostSummary } from '@/community/types'

/** The newest notices, above the figures.
 *
 * Nothing at all when there are none: notices are rare, and an empty card
 * saying so would take the top of the page from the figures most of the time.
 * A failed fetch arrives as the same empty list and is just as silent — the
 * page is still whole without it. */
export default function NoticeBanner({ notices }: { notices: PostSummary[] }) {
  if (notices.length === 0) return null

  return (
    <section className="notice-banner" aria-label="공지">
      <span className="notice-banner-icon" aria-hidden="true"><Megaphone size={15} /></span>
      <ul className="notice-banner-list">
        {notices.map((notice) => (
          <li key={notice.id}>
            <Link className="notice-banner-link" to={postPath(notice.id)}>
              <span className="notice-banner-title">{notice.title}</span>
              <span className="notice-banner-time">{formatTimeAgo(notice.created_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
