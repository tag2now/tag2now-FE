import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type SelectOption<T extends string = string> = {
  value: T
  label: string
}

type SelectProps<T extends string> = {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}

export default function Select<T extends string>({ value, options, onChange, label, className = '' }: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const move = (direction: number) => {
    const index = Math.max(0, options.findIndex((option) => option.value === value))
    const next = options[(index + direction + options.length) % options.length]
    if (next) onChange(next.value)
  }

  return (
    <div ref={rootRef} className={`custom-select ${open ? 'is-open' : ''} ${className}`}>
      <select
        className="sr-only"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        tabIndex={-1}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button
        type="button"
        className="custom-select-trigger"
        aria-label={`${label} 선택`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            move(event.key === 'ArrowDown' ? 1 : -1)
            setOpen(true)
          }
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div id={listId} role="listbox" aria-label={label} className="custom-select-menu scroll-area">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => { onChange(option.value); setOpen(false) }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
