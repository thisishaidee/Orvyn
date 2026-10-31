import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Skeleton } from './States'

type CardTone = 'default' | 'soft' | 'featured'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

const tones: Record<CardTone, string> = {
  default: 'bg-surface border border-line shadow-card',
  soft: 'bg-brand-mist border border-transparent',
  featured: 'bg-brand-gradient text-white border border-transparent shadow-raised',
}

const paddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5 lg:p-6',
  lg: 'p-5 sm:p-6 lg:p-8',
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
  padding?: CardPadding
}

export function Card({ tone = 'default', padding = 'md', className, ...rest }: CardProps) {
  return <div className={cn('min-w-0 rounded-card', tones[tone], paddings[padding], className)} {...rest} />
}

export interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** Section heading inside a card, with an optional trailing action. */
export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <h2 className="text-section text-brand-navy">{title}</h2>
        {description && <p className="mt-0.5 text-support text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export interface StatCardProps {
  label: string
  /** Pass `undefined` when the value is unknown. It renders an honest dash, never a placeholder number. */
  value?: ReactNode
  unit?: string
  hint?: ReactNode
  icon?: ReactNode
  loading?: boolean
  tone?: Exclude<CardTone, 'soft'>
  className?: string
}

/** One figure with a label. Values must come from live state; this component never invents one. */
export function StatCard({ label, value, unit, hint, icon, loading, tone = 'default', className }: StatCardProps) {
  const featured = tone === 'featured'
  return (
    <Card tone={tone} className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className={cn('text-label', featured ? 'text-brand-pale' : 'text-ink-soft')}>{label}</span>
        {icon && (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-control',
              featured ? 'bg-white/10 text-white' : 'bg-brand-mist text-brand-blue',
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className={cn('h-9 w-32', featured && 'bg-white/15')} />
      ) : (
        <p className="num flex flex-wrap items-baseline gap-x-1.5 text-figure md:text-figure-lg">
          {value === undefined || value === null ? (
            <span aria-label="Not available" className={featured ? 'text-brand-pale' : 'text-ink-mute'}>
              —
            </span>
          ) : (
            <span className="whitespace-nowrap">{value}</span>
          )}
          {unit && value !== undefined && (
            <span className={cn('text-body font-medium', featured ? 'text-brand-pale' : 'text-ink-soft')}>{unit}</span>
          )}
        </p>
      )}
      {hint && <p className={cn('text-support', featured ? 'text-brand-pale' : 'text-ink-soft')}>{hint}</p>}
    </Card>
  )
}
