import { WheelPicker, WheelPickerWrapper, type WheelPickerOption } from '@ncdai/react-wheel-picker'
import '@ncdai/react-wheel-picker/style.css'
import useModalDialog from '@/shared/hooks/useModalDialog'

const hourOptions: WheelPickerOption<string>[] = Array.from({ length: 24 }, (_, hour) => {
  const value = String(hour).padStart(2, '0')
  return { value, label: `${value}시` }
})
const minuteOptions: WheelPickerOption<string>[] = Array.from({ length: 60 }, (_, minute) => {
  const value = String(minute).padStart(2, '0')
  return { value, label: `${value}분` }
})

const wheelClassNames = {
  optionItem: 'font-display text-base font-medium text-txt-dim',
  highlightWrapper: 'z-20 bg-bg-row text-primary-text',
  highlightItem: 'font-display text-base font-medium text-primary-text',
}

/** The wheel time picker, opened from the create/edit form.
 *
 * It edits a *draft* rather than the form value: the wheels move as you spin
 * them, and committing on every tick would leave a cancelled picker having
 * already changed the time behind it.
 */
export default function TimePickerDialog({ draftTime, setDraftTime, onCancel, onConfirm }: {
  draftTime: string
  setDraftTime: (time: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialogRef = useModalDialog<HTMLDivElement>(onCancel)
  const [hour, minute] = draftTime.split(':')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-deep/75 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="시간 선택" className="w-full max-w-xs border border-primary-dim bg-bg-panel p-3 shadow-[0_12px_40px_rgba(0,0,0,0.75)]">
        <WheelPickerWrapper className="relative h-48 bg-bg-row">
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1/2 z-30 h-[30px] -translate-y-1/2 border-y border-primary-dim" />
          <WheelPicker value={hour} onValueChange={(next) => setDraftTime(`${next}:${minute}`)} options={hourOptions} infinite visibleCount={20} classNames={wheelClassNames} />
          <WheelPicker value={minute} onValueChange={(next) => setDraftTime(`${hour}:${next}`)} options={minuteOptions} infinite visibleCount={20} classNames={wheelClassNames} />
        </WheelPickerWrapper>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>취소</button>
          <button type="button" className="btn-primary" onClick={onConfirm}>선택 완료</button>
        </div>
      </div>
    </div>
  )
}
