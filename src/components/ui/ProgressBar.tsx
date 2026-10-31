import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ProgressTone = 'brand' | 'success' | 'warning' | 'danger' | 'auto'

const fills: Record<Exclude<ProgressTone, 'auto'>, string> = {
  brand: 'bg-gradient-to-r from-brand-blue to-brand-sky',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export interface ProgressBarProps {
  /** Amount used so far. Must come from live state. */
  value: number
  /** Limit. When 0 or less the bar renders empty. */
  max: number
  label?: ReactNode
  /** Text shown beside the label, for example the formatted amounts. */
  valueLabel?: ReactNode
  /** `auto` shifts to warning at 80% and danger at 100%. */
  tone?: ProgressTone
  size?: 'sm' | 'md'
  className?: string
}

export function ProgressBar({ value, max, label, valueLabel, tone = 'brand', size = 'md', className }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const pct = Math.round(ratio * 100)
  const resolved: Exclude<ProgressTone, 'auto'> =
    tone === 'auto' ? (ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'brand') : tone

  return (
    <div className={cn('w-full', className)}>
      {(label || valueLabel) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {label && <span className="text-label text-ink">{label}</span>}
          {valueLabel && <span className="num text-support text-ink-soft">{valueLabel}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={typeof label === 'string' ? label : 'Progress'}
        className={cn('w-full overflow-hidden rounded-full bg-brand-mist', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        {/* Moves with transform, not width, so it stays off the layout path. */}
        <div
          className={cn('h-full w-full rounded-full transition-transform duration-500 ease-out', fills[resolved])}
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </div>
    </div>
  )
}
