import { useId } from 'react'

type ToggleGroupProps<T extends string | number> = {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
  className?: string
}

/** Native radio choices whose callbacks preserve the original value type. */
export default function ToggleGroup<T extends string | number>({ value, options, onChange, label, className = '' }: ToggleGroupProps<T>) {
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
