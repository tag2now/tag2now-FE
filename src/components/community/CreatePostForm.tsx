import { useState } from 'react'
import CharacterGridPicker from './CharacterGridPicker'

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
    <div>
        <div className="flex mb-3 gap-6 items-center">
            <h3 className="m-0 text-secondary font-bold text-md uppercase tracking-wider">새 글 작성</h3>
            <button
                onClick={onCancel}
                className="bg-transparent border-0 text-primary text-sm font-bold uppercase tracking-wider cursor-pointer hover:text-white"
            >
                &larr; 목록
            </button>
        </div>
      <div className="mb-3 flex gap-2">
        {['자유', '랭매구인'].map((t) => (
          <button
            key={t}
            onClick={() => setPostType(t)}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border rounded cursor-pointer transition-colors ${
              postType === t ? 'bg-primary text-white border-primary' : 'bg-transparent text-txt-dim border-border-light hover:text-txt'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <CharacterGridPicker value={postType} onChange={setPostType} defaultValue="자유" />
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        aria-label="게시글 제목"
        className="input-base w-full px-3 py-2 mb-3 text-base"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="내용을 입력하세요... (최대 1000자)"
        aria-label="게시글 내용"
        rows={6}
        className="input-base w-full p-3 text-base resize-vertical"
      />
      <div className="text-right text-xs text-txt-dim mt-1">{body.length}/1000</div>

      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 bg-transparent text-error border border-error font-bold text-sm uppercase tracking-wider rounded cursor-pointer hover:bg-error hover:text-white"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim() || body.length > 1000}
          className="btn-primary px-4 py-1.5 uppercase tracking-wider"
        >
          {submitting ? '작성 중...' : '작성'}
        </button>
      </div>
    </div>
  )
}
