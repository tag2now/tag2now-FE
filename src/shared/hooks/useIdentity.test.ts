import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useIdentity from './useIdentity'
import { setIdentity } from '@/community/communityApi'
import { USERNAME_KEY } from '@/shared/util/cookie'

vi.mock('@/community/communityApi', () => ({ setIdentity: vi.fn() }))

const mockSetIdentity = vi.mocked(setIdentity)

const ensure = () => renderHook(() => useIdentity()).result.current.ensureIdentity()

describe('ensureIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockSetIdentity.mockResolvedValue(undefined as never)
  })

  it('registers a stored name once and hands it back', async () => {
    localStorage.setItem(USERNAME_KEY, 'TekkenGosu')

    await expect(ensure()).resolves.toBe('TekkenGosu')
    expect(mockSetIdentity).toHaveBeenCalledWith('TekkenGosu')
  })

  it('says so when no name has been set', async () => {
    await expect(ensure()).rejects.toThrow(
      '유저명이 설정되지 않았습니다. 상단바에서 유저명을 설정해주세요',
    )
    expect(mockSetIdentity).not.toHaveBeenCalled()
  })

  // The header refuses these on input, but a name saved before it started
  // doing so is still in this browser's storage, and every post and comment
  // routes through here. Without the check that user meets a bare 500 on every
  // write, with nothing naming the cause.
  it('refuses a stored name the backend cannot carry', async () => {
    localStorage.setItem(USERNAME_KEY, '철권고수')

    await expect(ensure()).rejects.toThrow(
      '유저명에 한글·이모지는 아직 쓸 수 없습니다. 영문·숫자로 입력해 주세요.',
    )
    expect(mockSetIdentity).not.toHaveBeenCalled()
  })

  it('leaves the refused name in storage rather than clearing it', async () => {
    localStorage.setItem(USERNAME_KEY, '철권고수')

    await expect(ensure()).rejects.toThrow()
    expect(localStorage.getItem(USERNAME_KEY)).toBe('철권고수')
  })

  it('accepts an accented name, which the backend does carry', async () => {
    localStorage.setItem(USERNAME_KEY, 'café')

    await expect(ensure()).resolves.toBe('café')
    expect(mockSetIdentity).toHaveBeenCalledWith('café')
  })
})
