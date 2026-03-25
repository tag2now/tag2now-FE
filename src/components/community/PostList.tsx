import { relativeTime } from '@/shared/timeFormat'
import CharacterGridPicker from './CharacterGridPicker'
import PostTypeBadge from './PostTypeBadge'
import type { PostSummary, LeaderboardEntry } from '@/types'
import AuthorBadge from './AuthorBadge'

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
  onWrite: () => void
  leaderboardEntries?: LeaderboardEntry[]
}

export default function PostList({
  posts, total, page, pageSize, loading, error,
  postType, onPostTypeChange, onPageChange, onSelectPost, onWrite, leaderboardEntries,
}: PostListProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {['all', '자유', '랭매구인'].map((t) => {
          const active = (t === 'all' && !postType) || postType === t
          return (
            <button
              key={t}
              onClick={() => onPostTypeChange(t === 'all' ? '' : t)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border rounded cursor-pointer transition-colors ${
                active ? 'bg-primary text-white border-primary' : 'bg-transparent text-txt-dim border-border-light hover:text-txt'
              }`}
            >
              {t === 'all' ? '전체' : t}
            </button>
          )
        })}
        <button
          onClick={onWrite}
          className="ml-auto px-3 py-1 bg-secondary text-bg-deep text-sm font-bold uppercase tracking-wider border-0 rounded cursor-pointer hover:bg-secondary-light"
        >
          글쓰기
        </button>
      </div>

      <div className="mb-4">
        <CharacterGridPicker value={postType} onChange={onPostTypeChange} defaultValue="" />
      </div>

      {loading && <p className="state-msg">로딩 중...</p>}
      {error && <p className="state-msg error">{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p className="state-msg">게시글이 없습니다</p>
      )}

      {!loading && posts.length > 0 && (
        <div className="flex flex-col gap-1">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => onSelectPost(post.id)}
              className="w-full text-left bg-bg-row border border-border rounded px-3 py-2 cursor-pointer transition-colors hover:bg-primary-hover hover:border-primary-dim flex items-center gap-2"
            >
              <span className="w-14 shrink-0 flex items-center justify-center">
                <PostTypeBadge postType={post.post_type} />
              </span>
              <div className="flex flex-1 min-w-0 items-center font-bold">
                <span className="text-sm text-white truncate">{post.title}</span>
                { post.comment_count > 0 && (<span className="text-gray-400">[{post.comment_count}]</span>)}
              </div>
              <AuthorBadge name={post.author} entries={leaderboardEntries} className="hidden! sm:flex!  shrink-0" />
              <span className="sm:hidden text-xs truncate max-w-20 sm:max-w-none">{post.author}</span>
              <span className="hidden sm:flex gap-2 text-xs text-txt-dim shrink-0">
                <span className="text-primary">&#9650; {post.thumbs_up}</span>
                <span>&#9660; {post.thumbs_down}</span>
              </span>
              <span className="hidden sm:inline text-xs text-txt-dim shrink-0">{relativeTime(post.created_at)}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 bg-transparent border border-border-light text-txt-dim text-sm font-bold rounded cursor-pointer disabled:opacity-30 hover:text-txt"
          >
            이전
          </button>
          <span className="text-sm text-txt-dim">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 bg-transparent border border-border-light text-txt-dim text-sm font-bold rounded cursor-pointer disabled:opacity-30 hover:text-txt"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
