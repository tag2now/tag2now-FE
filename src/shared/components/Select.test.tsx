import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import Select from './Select'

const options = [
  { value: '30', label: '약 30분' },
  { value: '60', label: '약 1시간' },
]

function Harness() {
  const [value, setValue] = useState('30')
  return <Select label="예상 시간" value={value} options={options} onChange={setValue} />
}

describe('Select', () => {
  it('exposes the field once, through the native control', () => {
    render(<Harness />)

    // The styled trigger used to carry the label too, so the field was
    // announced twice and every query for it was ambiguous.
    expect(screen.getAllByLabelText('예상 시간')).toHaveLength(1)
    expect(screen.getByLabelText('예상 시간').tagName).toBe('SELECT')
    expect(screen.queryByRole('button', { name: /예상 시간/ })).not.toBeInTheDocument()
  })

  it('keeps the decorative trigger out of the a11y tree and the tab order', () => {
    const { container } = render(<Harness />)
    const trigger = container.querySelector('.custom-select-trigger')!

    expect(trigger).toHaveAttribute('aria-hidden', 'true')
    expect(trigger).toHaveAttribute('tabindex', '-1')
  })

  it('shows the selected option on the trigger when the native control changes', () => {
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('예상 시간'), { target: { value: '60' } })

    expect(screen.getByLabelText('예상 시간')).toHaveValue('60')
    expect(document.querySelector('.custom-select-trigger')).toHaveTextContent('약 1시간')
  })

  it('picks a value from the styled menu on click', () => {
    const { container } = render(<Harness />)

    fireEvent.click(container.querySelector('.custom-select-trigger')!)
    // Scoped to the menu: the hidden native select carries the same option text.
    fireEvent.click(screen.getByText('약 1시간', { selector: '.custom-select-menu *' }))

    expect(screen.getByLabelText('예상 시간')).toHaveValue('60')
    expect(container.querySelector('.custom-select-menu')).not.toBeInTheDocument()
  })
})
