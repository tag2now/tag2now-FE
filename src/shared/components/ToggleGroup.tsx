import { useId } from 'react'
import type { SelectOption } from '@/shared/components/Select'

type ToggleGroupProps<T extends string> = {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}

/** A Select-shaped control that lays its options out as buttons instead of
 * hiding them behind a menu. Same props as Select, so a field can move between
 * the two without its call site changing. */
export default function ToggleGroup<T extends string>({ value, options, onChange, label, className = '' }: ToggleGroupProps<T>) {
  const name = useId()

  return (
    // The radios are the real control — keyboard and assistive tech get native
    // radio-group semantics from the fieldset, and each label is the hit area
    // for its own radio. The styling hangs off :checked, so no element is
    // duplicated for the pointer.
    <fieldset className={`toggle-group ${className}`}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className="toggle-group-option">
          <input
            className="sr-only"
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
