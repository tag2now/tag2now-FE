import { useEffect, useRef, useState } from 'react'
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
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  return (
    <div ref={rootRef} className={`custom-select ${open ? 'is-open' : ''} ${className}`}>
      {/* The real control: keyboard and assistive tech get native select
          semantics, and it is the only element carrying the label. The styled
          widget below is decoration for the pointer, hidden from the a11y tree
          so the field is not announced twice. */}
      <select
        className="sr-only"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button
        type="button"
        className="custom-select-trigger"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div aria-hidden="true" className="custom-select-menu scroll-area">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              tabIndex={-1}
              data-selected={option.value === value || undefined}
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
