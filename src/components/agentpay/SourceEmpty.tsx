import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import type { DataState } from '@/lib/agentpay'

interface SourceEmptyProps {
  state: DataState
  reason: string
  /** Noun for the data, for example "Leases". */
  subject: string
  /** "are" for plurals (default), "is" for mass nouns such as Activity. */
  verb?: 'are' | 'is'
  /** Shown only when the data source is connected and genuinely has nothing. */
  readyTitle: string
  readyDescription?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
}

/**
 * Empty state that never claims "none exist" when the app simply cannot see the data.
 * Not connected and "connected but empty" are different situations and read differently.
 */
export function SourceEmpty({ state, reason, subject, verb = 'are', readyTitle, readyDescription, icon, action }: SourceEmptyProps) {
  if (state === 'ready') return <EmptyState icon={icon} title={readyTitle} description={readyDescription} action={action} />
  const title =
    state === 'disconnected' ? `Connect a wallet to see ${subject.toLowerCase()}`
    : state === 'unsupported-network' ? `Switch to Arc to see ${subject.toLowerCase()}`
    : state === 'missing-address' ? `${subject} ${verb} unavailable`
    : state === 'error' ? `Could not load ${subject.toLowerCase()}`
    : state === 'loading' ? `Loading ${subject.toLowerCase()}`
    : `${subject} ${verb} not connected yet`
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={reason}
      action={action}
    />
  )
}
