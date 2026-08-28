export type PatchNote = {
  version: string
  items: string[]
}

/**
 * Newest first. The top entry's version doubles as the "seen" marker in
 * localStorage, so adding an entry here is what re-shows the dialog — there is
 * no second version constant to keep in sync.
 */
export const PATCH_NOTES: PatchNote[] = [
  {
    version: '2.1',
    items: [
      '리더보드에 100위 밖 플레이어도 표시',
      '리더보드 이름 검색 및 캐릭터 필터 추가',
      '내가 만든 예약 수정 / 삭제 가능',
    ],
  },
  {
    version: '2.0.1',
    items: ['Yaksa 까지 계급 이미지 추가'],
  },
  {
    version: '2.0',
    items: [
      '신규 서버로 변경 (rpcn.tag2now.click)',
    ],
  },
  {
    version: '1.1',
    items: [
      '유저 이름 클릭 시 플레이어 히스토리 패널 오픈\n(리더보드, 랭크매치, 주간 철악귀)',
      '플레이어 히스토리에 활동 시간대 차트 추가',
    ],
  },
]

export const LATEST_PATCH_VERSION = PATCH_NOTES[0].version
