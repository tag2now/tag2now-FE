import { useState } from 'react'
import CharacterGridPicker from '@/shared/components/CharacterGridPicker'
import { AlignLeft, ArrowLeft, FilePenLine, Send, Type, X } from 'lucide-react'

interface CreatePostFormProps {
  onSubmit: (title: string, body: string, postType: string) => Promise<void>
  onCancel: () => void
}

export default function CreatePostForm({ onSubmit, onCancel }: CreatePostFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [postType, setPostType] = useState('자유')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || body.length > 1000) return
    setSubmitting(true)
    try {
      await onSubmit(title.trim(), body.trim(), postType)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="detail-form">
        <div className="section-toolbar">
          <div className="section-title"><span className="section-icon"><FilePenLine size={15} /></span><div><h3>새 글 작성</h3><p>정보를 공유하거나 함께할 상대를 찾아보세요</p></div></div>
            <button
                onClick={onCancel}
                className="inline-flex min-h-8 items-center gap-1.5 bg-transparent border-0 text-primary-text text-xs font-bold cursor-pointer hover:text-white"
            >
                <ArrowLeft size={14} aria-hidden="true" /> 목록
            </button>
        </div>
      <div className="form-section writing-form">
      <div className="field-heading"><span className="field-label">게시글 유형</span><small>게시글 성격에 맞는 분류를 선택하세요.</small></div>
      <div className="segmented-control mb-3">
        {['자유', '랭매구인'].map((t) => (
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
      </div>

      <div className="form-actions">
        <button
          onClick={onCancel}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-error bg-transparent px-3 text-xs font-bold text-error cursor-pointer hover:bg-error hover:text-white"
        >
          <X size={14} aria-hidden="true" /> 취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim() || body.length > 1000}
          className="btn-primary px-4 py-1.5 uppercase tracking-[0.12em]"
        >
          {!submitting && <Send size={14} aria-hidden="true" />}{submitting ? '작성 중...' : '작성'}
        </button>
      </div>
    </div>
  )
}
