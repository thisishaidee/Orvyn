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
    <header className={cn('relative isolate flex flex-col gap-5 overflow-hidden rounded-[22px] border border-white/80 bg-white/65 px-5 py-5 shadow-[0_12px_34px_rgba(23,41,75,.045)] backdrop-blur-sm sm:px-7 sm:py-6 md:flex-row md:items-end md:justify-between md:gap-6 md:px-8 md:py-7', className)}>
      <div className="pointer-events-none absolute -right-12 -top-24 -z-10 size-64 rounded-full bg-[radial-gradient(circle,rgba(108,143,203,.16),transparent_68%)]" />
      <div className="min-w-0">
        {eyebrow && <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.17em] text-brand-blue"><span className="size-1.5 rounded-full bg-brand-blue" />{eyebrow}</p>}
        <h1 className="text-[2rem] font-light leading-[1.08] tracking-[-.045em] text-brand-navy sm:text-[2.55rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft sm:text-[15px] sm:leading-7">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </header>
  )
}
