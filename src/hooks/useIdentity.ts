import { useRef, useCallback } from 'react'
import { setIdentity } from '@/shared/communityApi'

const LS_KEY = 'ttt2-username'

export default function useIdentity() {
  const identitySet = useRef(false)

  const getUsername = useCallback(() => localStorage.getItem(LS_KEY), [])

  const ensureIdentity = useCallback(async () => {
    const name = localStorage.getItem(LS_KEY)
    if (!name) throw new Error('유저명이 설정되지 않았습니다. 상단바에서 유저명을 설정해주세요')
    if (!identitySet.current) {
      await setIdentity(name)
      identitySet.current = true
    }
    return name
  }, [])

  return { getUsername, ensureIdentity }
}
