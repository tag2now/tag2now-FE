import { useState } from 'react'
import { parseYouTubeVideoId } from '@/community/youtube'
import YouTubeVideo from './YouTubeVideo'
import CharacterGridPicker from '@/shared/components/CharacterGridPicker'
import { POST_TYPES } from '@/community/types'
import { AlignLeft, ArrowLeft, FilePenLine, Send, Type, X } from 'lucide-react'

interface CreatePostFormProps {
  initialPost?: { title: string; body: string; post_type: string; youtube_video_id?: string | null }
  onSubmit: (title: string, body: string, postType: string, youtubeVideoId?: string) => Promise<void>
  onCancel: () => void
}

export default function CreatePostForm({ onSubmit, onCancel, initialPost }: CreatePostFormProps) {
  const editing = !!initialPost
  const [title, setTitle] = useState(initialPost?.title ?? '')
  const [body, setBody] = useState(initialPost?.body ?? '')
  const [postType, setPostType] = useState(initialPost?.post_type ?? '자유')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState(initialPost?.youtube_video_id ? `https://www.youtube.com/watch?v=${initialPost.youtube_video_id}` : '')
  const youtubeVideoId = parseYouTubeVideoId(youtubeUrl)
  const invalidYoutubeUrl = !!youtubeUrl.trim() && !youtubeVideoId

  const handleSubmit = async () => {
    if (submitting || !title.trim() || title.length > 100 || !body.trim() || body.length > 1000 || invalidYoutubeUrl) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(title.trim(), body.trim(), postType, youtubeVideoId ?? undefined)
    } catch (error) {
      setError(error instanceof Error ? error.message : '저장하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="detail-form">
        <div className="section-toolbar">
          <div className="section-title"><span className="section-icon"><FilePenLine size={15} /></span><div><h3>{editing ? '게시글 수정' : '새 글 작성'}</h3><p>{editing ? '내용과 첨부 영상을 변경한 뒤 저장하세요.' : '정보를 공유하거나 함께할 상대를 찾아보세요'}</p></div></div>
            <button
                onClick={onCancel}
                disabled={submitting}
                className="inline-flex min-h-8 items-center gap-1.5 bg-transparent border-0 text-primary-text text-xs font-bold cursor-pointer hover:text-white"
            >
                <ArrowLeft size={14} aria-hidden="true" /> {editing ? '돌아가기' : '목록'}
            </button>
        </div>
      <div className="form-section writing-form">
      <div className="field-heading"><span className="field-label">게시글 유형</span><small>게시글 성격에 맞는 분류를 선택하세요.</small></div>
      <div className="segmented-control mb-3">
        {POST_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setPostType(t)}
            className={`cursor-pointer transition-colors ${
              postType === t ? 'active' : ''
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="character-filter mb-4">
        <CharacterGridPicker value={postType} onChange={setPostType} defaultValue="자유" />
      </div>

      <div className="field-heading"><label htmlFor="post-title" className="field-label">제목</label><small>내용을 한눈에 이해할 수 있게 작성하세요.</small></div>
      <div className="input-shell">
      <Type size={15} aria-hidden="true" />
      <input
        id="post-title"
        type="text"
        maxLength={100}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요"
        aria-label="게시글 제목"
        className="input-base w-full text-base"
      />
      </div>

      <div className="field-heading mt-4"><label htmlFor="post-body" className="field-label">내용</label><small>개인정보나 민감한 정보는 입력하지 마세요.</small></div>
      <div className="textarea-shell">
      <AlignLeft size={15} aria-hidden="true" />
      <textarea
        id="post-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="내용을 입력하세요(최대 1000자)"
        aria-label="게시글 내용"
        rows={6}
        className="input-base w-full p-3 text-base resize-vertical"
      />
      </div>
      <div className={`character-count ${body.length > 900 ? 'near-limit' : ''}`}>{body.length.toLocaleString()} / 1,000</div>
      <div className="field-heading mt-4">
        <label htmlFor="post-youtube" className="field-label">YouTube 영상 <span className="text-txt-dim">(선택)</span></label>
        <small>글에 영상 1개를 연결할 수 있어요.</small>
      </div>
      <div className="input-shell">
        <input
          id="post-youtube"
          type="url"
          value={youtubeUrl}
          onChange={(event) => setYoutubeUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          aria-invalid={invalidYoutubeUrl}
          aria-describedby="post-youtube-help"
          className="input-base w-full text-base"
        />
        {youtubeUrl && <button type="button" onClick={() => setYoutubeUrl('')} aria-label="YouTube 영상 제거" className="btn-ghost shrink-0"><X size={16} aria-hidden="true" /></button>}
      </div>
      <p id="post-youtube-help" className={`mt-2 text-xs ${invalidYoutubeUrl ? 'text-error' : 'text-txt-dim'}`} role={invalidYoutubeUrl ? 'alert' : undefined}>
        {invalidYoutubeUrl ? '올바른 YouTube 영상 링크를 입력해 주세요.' : '일반 영상, 공유 링크(youtu.be), Shorts 링크를 지원합니다.'}
      </p>
      {youtubeVideoId && <YouTubeVideo videoId={youtubeVideoId} />}
      </div>

      <div className="form-actions">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-error bg-transparent px-3 text-xs font-bold text-error cursor-pointer hover:bg-error hover:text-white"
        >
          <X size={14} aria-hidden="true" /> 취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || title.length > 100 || !body.trim() || body.length > 1000 || invalidYoutubeUrl}
          className="btn-primary px-4 py-1.5 uppercase tracking-[0.12em]"
        >
          {!submitting && <Send size={14} aria-hidden="true" />}{submitting ? '저장 중...' : editing ? '저장' : '작성'}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
    </div>
  )
}
