import type { RecordPages } from '@/shared/hooks/useRecordPages'

/** The next page of a record list; nothing once the last one is shown. */
export default function RecordMoreButton({ pages }: { pages: Pick<RecordPages<unknown>, 'hasMore' | 'loadingMore' | 'moreFailed' | 'loadMore'> }) {
  if (!pages.hasMore) return null
  return (
    <div className="record-more">
      {pages.moreFailed && <span role="alert">더 불러오지 못했습니다.</span>}
      <button type="button" className="btn-ghost" onClick={pages.loadMore} disabled={pages.loadingMore}>
        {pages.loadingMore ? '불러오는 중' : pages.moreFailed ? '다시 시도' : '더 보기'}
      </button>
    </div>
  )
}
