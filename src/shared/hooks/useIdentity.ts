import { useRef, useCallback } from 'react'
import { setIdentity} from "@/community/communityApi";
import { getUsername as getSavedUsername, isTransportableUsername, UNTRANSPORTABLE_USERNAME_MSG} from "@/shared/util/cookie";
import { AppError } from '@/shared/util/AppError'

export default function useIdentity() {
  const identitySet = useRef(false)

  const getUsername = useCallback(() => getSavedUsername(), [])

  const ensureIdentity = useCallback(async () => {
    const name = getSavedUsername()
    if (!name) throw new AppError('유저명이 설정되지 않았습니다. 상단바에서 유저명을 설정해주세요')
    // A name saved before the header started refusing these still reaches here,
    // and setIdentity would answer 500 with nothing to show for it.
    if (!isTransportableUsername(name)) throw new AppError(UNTRANSPORTABLE_USERNAME_MSG)
    if (!identitySet.current) {
      await setIdentity(name)
      identitySet.current = true
    }
    return name
  }, [])

  return { getUsername, ensureIdentity }
}
