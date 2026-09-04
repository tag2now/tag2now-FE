import { formatTimeAgo } from '@/shared/util/timeFormat'
import CharacterGridPicker from '@/shared/components/CharacterGridPicker'
import PostTypeBadge from './PostTypeBadge'
import type { LeaderboardEntry} from "@/shared/types";
import { POST_TYPES } from "@/community/types";
import type {PostSummary} from "@/community/types";
import AuthorBadge from './AuthorBadge'
import { ChevronLeft, ChevronRight, MessageSquare, MessagesSquare, PenLine, RefreshCw, SlidersHorizontal, ThumbsDown, ThumbsUp } from 'lucide-react'

interface PostListProps {
  posts: PostSummary[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  postType: string
  onPostTypeChange: (type: string) => void
  onPageChange: (page: number) => void
  onSelectPost: (id: number) => void
  onRefresh: () => void
  onWrite: () => void
  leaderboardEntries?: LeaderboardEntry[]
}

export default function PostList({
  posts, total, page, pageSize, loading, error,
  postType, onPostTypeChange, onPageChange, onSelectPost, onRefresh, onWrite, leaderboardEntries,
}: PostListProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="section-toolbar community-section-toolbar">
        <div className="section-title">
          <span className="section-icon"><MessagesSquare size={15} /></span>
          <div><h3>커뮤니티 피드</h3><p>전체 게시글 {total}개</p></div>
        </div>
        <div className="toolbar-actions">
          <button onClick={onRefresh} disabled={loading} aria-label="새로고침" className="refresh-btn"><RefreshCw size={14} aria-hidden="true" /></button>
          <button onClick={onWrite} className="btn-primary"><PenLine size={14} aria-hidden="true" /> 글쓰기</button>
        </div>
      </div>

      <div className="community-filter-bar">
        <div className="community-filter-heading">
          <span className="community-filter-icon" aria-hidden="true"><SlidersHorizontal size={14} /></span>
          <div>
            <strong>게시글 분류</strong>
            <small>보고 싶은 게시글 유형을 선택하세요.</small>
          </div>
        </div>
        <div className="community-filter-controls">
          <div className="segmented-control" role="group" aria-label="게시글 분류">
            {['all', ...POST_TYPES].map((t) => {
              const active = (t === 'all' && !postType) || postType === t
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => onPostTypeChange(t === 'all' ? '' : t)}
                  aria-pressed={active}
                  className={`cursor-pointer transition-colors ${active ? 'active' : ''}`}
                >
                  {t === 'all' ? '전체' : t}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="character-filter">
        <CharacterGridPicker value={postType} onChange={onPostTypeChange} defaultValue="" />
      </div>

      {loading && <p className="state-msg">로딩 중...</p>}
      {error && <p className="state-msg error">{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p className="state-msg">게시글이 없습니다</p>
      )}

      {!loading && posts.length > 0 && (
        <div className="post-list" aria-live="polite">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => onSelectPost(post.id)}
              aria-label={`${post.title} — ${post.post_type}`}
              className="post-row"
            >
              <span className="w-14 shrink-0 flex items-center justify-center">
                <PostTypeBadge postType={post.post_type} />
              </span>
              <div className="flex flex-1 min-w-0 items-center font-bold">
                <span className="text-sm text-txt truncate">{post.title}</span>
                { post.comment_count > 0 && (<span className="ml-1 inline-flex items-center gap-0.5 text-txt-dim"><MessageSquare size={11} />{post.comment_count}</span>)}
              </div>
              <AuthorBadge name={post.author} entries={leaderboardEntries} className="hidden sm:inline-flex shrink-0" />
              <span className="sm:hidden text-xs truncate max-w-20 sm:max-w-none">{post.author}</span>
              <span className="hidden sm:flex gap-2 text-xs text-txt-dim shrink-0">
                <span className="inline-flex items-center gap-1 text-primary-text"><ThumbsUp size={12} /> {post.thumbs_up}</span>
                <span className="inline-flex items-center gap-1"><ThumbsDown size={12} /> {post.thumbs_down}</span>
              </span>
              <span className="hidden sm:inline text-xs text-txt-dim shrink-0">{formatTimeAgo(post.created_at)}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="이전 페이지"
            className="btn-ghost disabled:opacity-30"
          >
            <ChevronLeft size={14} aria-hidden="true" /> 이전
          </button>
          <span className="text-sm text-txt-dim" aria-live="polite" aria-atomic="true">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="다음 페이지"
            className="btn-ghost disabled:opacity-30"
          >
            다음 <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
