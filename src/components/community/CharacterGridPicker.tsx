import { CHARACTER_GRID, charImageUrl } from '@/shared/characterImage'

interface CharacterGridPickerProps {
  value: string
  onChange: (name: string) => void
  defaultValue: string
}

export default function CharacterGridPicker({ value, onChange, defaultValue }: CharacterGridPickerProps) {
  return (
    <div className="overflow-x-auto">
      {CHARACTER_GRID.map((row, ri) => (
        <div key={ri} className="flex gap-0.5 mb-0.5">
          {row.map((name, ci) => {
            const url = charImageUrl(name)
            if (!url) return <div key={ci} className="w-1/23 h-9" />
            const active = value === name
            return (
              <button
                key={name}
                onClick={() => onChange(active ? defaultValue : name)}
                className={`w-1/23 h-9 p-0 border rounded cursor-pointer transition-all ${
                  active ? 'border-primary border-2 shadow-[0_0_6px_var(--color-primary-glow)]' : 'border-transparent hover:border-primary-dim'
                }`}
                title={name}
              >
                <img src={url} alt={name} className={`h-full object-cover rounded block`} />
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
