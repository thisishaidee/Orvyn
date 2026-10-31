import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** Small label above the title, for example the section name. */
  eyebrow?: string
  /** Actions stack full-width on mobile and sit to the right from tablet up. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-overline uppercase text-brand-blue">{eyebrow}</p>}
        <h1 className="text-page-sm text-brand-navy md:text-page">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-body text-ink-soft">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </header>
  )
}
