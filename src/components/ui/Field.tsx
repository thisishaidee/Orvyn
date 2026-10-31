import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

export interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  optional?: boolean
  className?: string
  /** Receives the id and ARIA props to spread onto the control, so label and messages stay connected. */
  children: (control: FieldControlProps) => ReactNode
}

export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const uid = useId()
  const id = `field-${uid}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-label text-ink">
        <span>{label}</span>
        {optional && <span className="text-support font-normal text-ink-mute">Optional</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-support text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-support font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const controlBase =
  'w-full rounded-control border bg-surface text-ink placeholder:text-ink-mute transition-colors duration-150 ' +
  'border-line-strong hover:border-brand-sky focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-sky/25 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20 ' +
  'disabled:cursor-not-allowed disabled:bg-brand-mist disabled:text-ink-mute'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(controlBase, 'h-11 px-3.5', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(controlBase, 'min-h-24 px-3.5 py-2.5', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...rest },
  ref,
) {
  return <select ref={ref} className={cn(controlBase, 'h-11 px-3', className)} {...rest} />
})

export interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string
  onValueChange: (value: string) => void
  /** Token label shown inside the field. USDC by default. */
  unit?: string
  /** Maximum decimals accepted. USDC ERC-20 amounts use 6. */
  decimals?: number
  /** Optional "Max" action. Wire it to a real balance only. */
  onMax?: () => void
}

/** Decimal amount entry. Keeps the value as a string so no precision is lost before parsing. */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { value, onValueChange, unit = 'USDC', decimals = 6, onMax, className, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={value}
        onChange={(event) => {
          const next = event.target.value.replace(/,/g, '.')
          const pattern = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`)
          if (next === '' || pattern.test(next)) onValueChange(next)
        }}
        className={cn(controlBase, 'num h-14 pl-4 pr-28 text-figure-sm', className)}
        {...rest}
      />
      <div className="absolute inset-y-0 right-3 flex items-center gap-2">
        {onMax && (
          <button
            type="button"
            onClick={onMax}
            className="rounded-md px-2 py-1 text-label text-brand-blue hover:bg-brand-mist"
          >
            Max
          </button>
        )}
        <span className="text-label text-ink-soft">{unit}</span>
      </div>
    </div>
  )
})
