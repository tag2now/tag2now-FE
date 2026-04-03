import { useRef, useCallback } from 'react'
import { setIdentity} from "@/community/communityApi";
import { getUsername as getSavedUsername} from "@/shared/util/cookie";

export default function useIdentity() {
  const identitySet = useRef(false)

  const getUsername = useCallback(() => getSavedUsername(), [])

  const ensureIdentity = useCallback(async () => {
    const name = getSavedUsername()
    if (!name) throw new Error('유저명이 설정되지 않았습니다. 상단바에서 유저명을 설정해주세요')
    if (!identitySet.current) {
      await setIdentity(name)
      identitySet.current = true
    }
    return name
  }, [])

  return { getUsername, ensureIdentity }
}
