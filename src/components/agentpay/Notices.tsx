import { useId, type ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import { Button, type ButtonProps, Notice } from '@/components/ui'
import { ACTION_PENDING_REASON, useLeases } from '@/lib/agentpay'
import { cn } from '@/lib/cn'

/** Explains, once per page, why lists are empty and actions are disabled. */
export function NotConnectedNotice({ subject }: { subject: string }) {
  const source = useLeases()
  if (source.state === 'ready') return null
  const title =
    source.state === 'disconnected' ? 'Wallet not connected'
    : source.state === 'unsupported-network' ? 'Unsupported network'
    : source.state === 'missing-address' ? 'Contract address not configured'
    : source.state === 'error' ? 'Could not read the contract'
    : source.state === 'loading' ? 'Reading the contract'
    : 'Not connected to the contract yet'
  return (
    <Notice tone={source.state === 'error' ? 'danger' : 'info'} title={title}>
      {source.reason || `The ${subject} section cannot be filled until the Orvynn contract can be read.`}
    </Notice>
  )
}

/** A button for a contract action the app cannot perform yet. Always disabled, with the reason announced. */
export function PendingAction({ reason = ACTION_PENDING_REASON, className, children, ...rest }: ButtonProps & { reason?: string }) {
  const id = useId()
  return (
    <span className={cn('flex w-full flex-col sm:inline-flex sm:w-auto')}>
      <Button {...rest} disabled title={reason} aria-describedby={id} className={cn('w-full sm:w-auto', className)}>
        {children}
      </Button>
      <span id={id} className="sr-only">
        {reason}
      </span>
    </span>
  )
}

/** Label/value row used in settings, wallet and permission lists. Stacks on mobile, side by side from tablet. */
export function InfoRow({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3.5 md:flex-row md:items-start md:justify-between md:gap-6">
      <dt className="shrink-0 text-label text-ink-soft md:w-56">{label}</dt>
      <dd className="min-w-0 break-words text-body text-ink md:flex-1 md:text-right">
        {children}
        {hint && <p className="mt-0.5 text-support text-ink-soft">{hint}</p>}
      </dd>
    </div>
  )
}

export function InfoList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-line">{children}</dl>
}

/** Whether a capability is enforced by the contract and whether the app is wired to it. */
export function SupportChips({ inContract, inApp }: { inContract: boolean; inApp: boolean }) {
  const chip = (on: boolean, yes: string, no: string) => (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-overline',
        on ? 'bg-success-soft text-success' : 'bg-brand-mist text-ink-soft',
      )}
    >
      {on ? <Check className="size-3" aria-hidden /> : <Minus className="size-3" aria-hidden />}
      {on ? yes : no}
    </span>
  )
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {chip(inContract, 'In contract', 'Not in contract')}
      {chip(inApp, 'In app', 'App not connected')}
    </span>
  )
}
