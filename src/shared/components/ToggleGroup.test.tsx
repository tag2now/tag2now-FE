import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ToggleGroup from './ToggleGroup'

describe('ToggleGroup', () => {
  it('exposes a named single selection and reports an empty string without coercion', () => {
    const onChange = vi.fn()
    const options = [{ value: '', label: '전체' }, { value: 'guide', label: '공략' }]
    const { rerender } = render(<ToggleGroup label="분류" value="guide" options={options} onChange={onChange} />)
    const group = screen.getByRole('group', { name: '분류' })
    expect(within(group).getByRole('radio', { name: '공략' })).toBeChecked()

    fireEvent.click(within(group).getByRole('radio', { name: '전체' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('')
    rerender(<ToggleGroup label="분류" value="" options={options} onChange={onChange} />)
    expect(within(group).getByRole('radio', { name: '전체' })).toBeChecked()
    expect(within(group).getByRole('radio', { name: '공략' })).not.toBeChecked()
  })

  it('reports the original numeric option, including zero', () => {
    const onChange = vi.fn()
    render(<ToggleGroup label="숫자" value={7} options={[{ value: 0, label: '없음' }, { value: 7, label: '7일' }]} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: '없음' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('keeps two groups independent and does not submit the enclosing form', () => {
    function Form() {
      const [period, setPeriod] = useState(7)
      const [limit, setLimit] = useState(7)
      const options = [{ value: 7, label: '7' }, { value: 14, label: '14' }]
      return (
        <form onSubmit={onSubmit}>
          <ToggleGroup label="기간" value={period} options={options} onChange={setPeriod} />
          <ToggleGroup label="개수" value={limit} options={options} onChange={setLimit} />
        </form>
      )
    }
    const onSubmit = vi.fn((event) => event.preventDefault())
    render(<Form />)
    const period = screen.getByRole('group', { name: '기간' })
    const limit = screen.getByRole('group', { name: '개수' })

    fireEvent.click(within(period).getByRole('radio', { name: '14' }))
    expect(within(period).getByRole('radio', { name: '14' })).toBeChecked()
    expect(within(limit).getByRole('radio', { name: '7' })).toBeChecked()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
