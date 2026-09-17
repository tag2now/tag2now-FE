import { useState } from 'react'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import CharacterGridPicker from '@/shared/components/CharacterGridPicker'
import PostTypeBadge from './PostTypeBadge'
import type { LeaderboardEntry} from "@/shared/types";
import { MAX_POST_CHARACTERS, POST_TYPES } from "@/community/types";
import type {PostSummary} from "@/community/types";
import AuthorBadge from './AuthorBadge'
import { ChevronDown, ChevronLeft, ChevronRight, MessageSquare, MessagesSquare, PenLine, RefreshCw, SlidersHorizontal, ThumbsDown, ThumbsUp, Users } from 'lucide-react'

interface PostListProps {
  posts: PostSummary[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  postType: string
  onPostTypeChange: (type: string) => void
  /** Characters the list is filtered to, at most two. */
  characters: string[]
  onCharactersChange: (characters: string[]) => void
  onPageChange: (page: number) => void
  onSelectPost: (id: number) => void
  onRefresh: () => void
  onWrite: () => void
  leaderboardEntries?: LeaderboardEntry[]
}

export default function PostList({
  posts, total, page, pageSize, loading, error,
  postType, onPostTypeChange, characters, onCharactersChange,
  onPageChange, onSelectPost, onRefresh, onWrite, leaderboardEntries,
}: PostListProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
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

      <div className="section-toolbar filter-toolbar">
        <div className="section-title">
          <span className="section-icon" aria-hidden="true"><SlidersHorizontal size={14} /></span>
          <div>
            <strong>게시글 분류</strong>
            <small>보고 싶은 게시글 유형을 선택하세요.</small>
          </div>
        </div>
        <div className="section-controls">
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

      {/* Filters the list by character, independently of the category above —
          the two used to be the same control, so narrowing to 공략 and
          narrowing to Jin were mutually exclusive.

          Folded away until asked for, the way the leaderboard's picker already
          is. Sixty portraits are taller than a phone screen: opening this tab
          showed the filter and not one post, and the grid is a thing you reach
          for occasionally while the posts are what you came for. */}
      <div className="character-filter-bar">
        <button
          type="button"
          className={`lb-char-toggle${characters.length > 0 ? ' is-active' : ''}`}
          aria-expanded={pickerOpen}
          aria-controls="community-character-picker"
          aria-label={characters.length > 0 ? `캐릭터 필터: ${characters.join(', ')}` : '캐릭터 필터'}
          onClick={() => setPickerOpen((open) => !open)}
        >
          <Users size={14} aria-hidden="true" />
          <span>{characters.length > 0 ? characters.join(', ') : '캐릭터'}</span>
          <ChevronDown size={14} aria-hidden="true" className={pickerOpen ? 'is-open' : undefined} />
        </button>
        {/* Clearing is its own control: with the grid folded away, deselecting
            had no reachable UI. */}
        {characters.length > 0 && (
          <button type="button" className="btn-ghost" onClick={() => onCharactersChange([])}>해제</button>
        )}
      </div>
      {pickerOpen && (
        <div id="community-character-picker" className="character-filter">
          <CharacterGridPicker
            selected={characters}
            onToggle={(name) => onCharactersChange(
              characters.includes(name)
                ? characters.filter((entry) => entry !== name)
                : characters.length >= MAX_POST_CHARACTERS ? characters : [...characters, name],
            )}
            max={MAX_POST_CHARACTERS}
          />
        </div>
      )}
      {characters.length > 0 && (
        <p className="selected-characters" role="status">
          <strong>{characters.join(', ')}</strong> 관련 글만 표시 중
        </p>
      )}

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
              aria-label={[post.title, post.post_type, ...(post.characters ?? [])].join(' — ')}
              className="post-row"
            >
              <span className="post-row-tags">
                <PostTypeBadge postType={post.post_type} characters={post.characters ?? []} />
              </span>
              <span className="post-row-title">{post.title}</span>
              <AuthorBadge name={post.author} entries={leaderboardEntries} className="post-row-author" />
              {/* One cluster for how the post is doing. The comment count used
                  to be welded to the title and the two votes sat at the far
                  end, so three figures of the same kind were read in two
                  places. A figure only appears once it is not zero: every row
                  printed "☝ 0 ☟ 0", which is the same as saying nothing while
                  taking the space and the eye of something that says a lot. */}
              <span className="post-row-stats">
                {post.comment_count > 0 && (
                  <span className="post-stat"><MessageSquare size={11} aria-hidden="true" />{post.comment_count}<span className="sr-only"> 댓글</span></span>
                )}
                {post.thumbs_up > 0 && (
                  <span className="post-stat is-up"><ThumbsUp size={11} aria-hidden="true" />{post.thumbs_up}<span className="sr-only"> 추천</span></span>
                )}
                {post.thumbs_down > 0 && (
                  <span className="post-stat"><ThumbsDown size={11} aria-hidden="true" />{post.thumbs_down}<span className="sr-only"> 비추천</span></span>
                )}
              </span>
              <span className="post-row-time">{formatTimeAgo(post.created_at)}</span>
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
