import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Inbox, Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/** Pulsing placeholder for content that is still loading. Decorative: pair with a status message. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-control bg-brand-mist', className)} aria-hidden>
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex">
      <Loader2 className={cn('size-5 animate-spin text-brand-blue', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}

interface StatePanelProps {
  icon: ReactNode
  iconClass: string
  title: string
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  role?: 'status' | 'alert'
  className?: string
}

function StatePanel({ icon, iconClass, title, description, action, children, role = 'status', className }: StatePanelProps) {
  return (
    <div
      role={role}
      className={cn('mx-auto flex w-full max-w-md flex-col items-center px-4 py-10 text-center sm:py-14', className)}
    >
      <span className={cn('mb-4 flex size-12 items-center justify-center rounded-full', iconClass)} aria-hidden>
        {icon}
      </span>
      <h3 className="text-section text-brand-navy">{title}</h3>
      {description && <p className="mt-1.5 text-body text-ink-soft">{description}</p>}
      {children}
      {action && <div className="mt-5 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">{action}</div>}
    </div>
  )
}

export function LoadingState({ title = 'Loading', description }: { title?: string; description?: ReactNode }) {
  return (
    <StatePanel
      icon={<Loader2 className="size-6 animate-spin" />}
      iconClass="bg-brand-mist text-brand-blue"
      title={title}
      description={description}
    />
  )
}

export interface ErrorStateProps {
  title?: string
  message?: ReactNode
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  return (
    <StatePanel
      role="alert"
      icon={<AlertCircle className="size-6" />}
      iconClass="bg-danger-soft text-danger"
      title={title}
      description={message}
      action={onRetry && <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>}
    />
  )
}

export interface SuccessStateProps {
  title: string
  message?: ReactNode
  /** Real follow-up content only, for example an explorer link for a confirmed transaction. */
  children?: ReactNode
  action?: ReactNode
}

export function SuccessState({ title, message, children, action }: SuccessStateProps) {
  return (
    <StatePanel
      icon={<CheckCircle2 className="size-6" />}
      iconClass="bg-success-soft text-success"
      title={title}
      description={message}
      action={action}
    >
      {children}
    </StatePanel>
  )
}

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <StatePanel
      icon={<Icon className="size-6" />}
      iconClass="bg-brand-mist text-brand-blue"
      title={title}
      description={description}
      action={action}
    />
  )
}

type NoticeTone = 'info' | 'success' | 'warning' | 'danger'

const noticeStyles: Record<NoticeTone, { box: string; icon: LucideIcon }> = {
  info: { box: 'bg-brand-mist border-brand-pale text-ink', icon: Info },
  success: { box: 'bg-success-soft border-success/30 text-ink', icon: CheckCircle2 },
  warning: { box: 'bg-warning-soft border-warning/30 text-ink', icon: AlertTriangle },
  danger: { box: 'bg-danger-soft border-danger/30 text-ink', icon: AlertCircle },
}

const noticeIconColor: Record<NoticeTone, string> = {
  info: 'text-brand-blue',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/** Inline banner for page-level or form-level messages. */
export function Notice({ tone = 'info', title, children, className }: { tone?: NoticeTone; title?: string; children?: ReactNode; className?: string }) {
  const { box, icon: Icon } = noticeStyles[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-card border p-4', box, className)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', noticeIconColor[tone])} aria-hidden />
      <div className="min-w-0 text-body">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('text-ink-soft', title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  )
}
