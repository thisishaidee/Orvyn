import { useMemo, useState } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, CardHeader, ConfirmDialog, DataTable, PageHeader, ProgressBar, StatusBadge, type Column } from '@/components/ui'
import { LeaseDetail } from '@/components/agentpay/LeaseDetail'
import { CreateLeaseModal } from '@/components/agentpay/CreateLeaseModal'
import { NotConnectedNotice, PendingAction } from '@/components/agentpay/Notices'
import { SourceEmpty } from '@/components/agentpay/SourceEmpty'
import {
  formatDateTime,
  formatUsdc,
  leaseStatus,
  remainingAllowance,
  shortAddress,
  useLeases,
  type Lease,
  type LeaseStatus,
} from '@/lib/agentpay'
import { cn } from '@/lib/cn'
import { useAgentPayTransactions } from '@/lib/agentpay-transactions'

type Filter = 'all' | LeaseStatus
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'expired', label: 'Expired' },
  { id: 'revoked', label: 'Revoked' },
]

export function LeasesPage() {
  const source = useLeases()
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<Lease | undefined>()
  const [revoking, setRevoking] = useState(false)
  const transactions = useAgentPayTransactions()

  const withStatus = useMemo(() => source.items.map((lease) => ({ lease, status: leaseStatus(lease) })), [source.items])
  const rows = withStatus.filter((r) => filter === 'all' || r.status === filter)
  const selected = source.items.find((l) => l.id === selectedId)
  const ready = source.state === 'ready'
  const count = (f: Filter) => (ready ? String(withStatus.filter((r) => f === 'all' || r.status === f).length) : '—')

  const columns: Column<{ lease: Lease; status: LeaseStatus }>[] = [
    {
      key: 'agent',
      header: 'Agent',
      primary: true,
      cell: ({ lease }) => (
        <span className="flex flex-col">
          <span className="num font-mono text-support" title={lease.delegate}>{shortAddress(lease.delegate)}</span>
          <span className="text-support font-normal text-ink-soft">Lease {lease.id}</span>
        </span>
      ),
    },
    { key: 'cap', header: 'Cap per period', align: 'right', cell: ({ lease }) => <span className="num">{formatUsdc(lease.cap)} USDC</span> },
    {
      key: 'spent',
      header: 'Spent / remaining',
      hideOnTablet: true,
      cell: ({ lease, status }) => (
        <div className="min-w-36">
          <ProgressBar size="sm" tone="auto" value={Number(lease.spentThisPeriod)} max={Number(lease.cap)} />
          <p className="num mt-1 text-support text-ink-soft">
            {formatUsdc(lease.spentThisPeriod)} spent · {formatUsdc(remainingAllowance(lease, status))} left
          </p>
        </div>
      ),
    },
    { key: 'expiry', header: 'Expiry', cell: ({ lease }) => formatDateTime(lease.expiry) },
    { key: 'recipients', header: 'Recipients', hideOnTablet: true, cell: ({ lease }) => (lease.allowlistEnabled ? 'Approved only' : 'Any recipient') },
    { key: 'status', header: 'Status', cell: ({ status }) => <StatusBadge status={status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: ({ lease }) => (
        <span className="inline-flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSelectedId(lease.id)}>
            View
          </Button>
          <Button size="sm" variant="destructive" disabled={transactions.state !== 'ready' || leaseStatus(lease) !== 'active'} onClick={() => setRevokeTarget(lease)}>
            Revoke
          </Button>
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Leases"
        title="Leases"
        description="A lease is a spending agreement between you and an agent: how much it may spend, how often, until when, and to whom."
        actions={
          <Button iconLeft={<Plus className="size-4" aria-hidden />} onClick={() => setCreateOpen(true)}>Create lease</Button>
        }
      />
      <NotConnectedNotice subject="Leases" />
      <CreateLeaseModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setSelectedId(undefined)} />
      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke this lease?"
        description="The agent will no longer be able to spend from this lease. This action cannot be undone."
        confirmLabel="Revoke lease"
        tone="destructive"
        loading={revoking}
        onCancel={() => { if (!revoking) setRevokeTarget(undefined) }}
        onConfirm={() => {
          if (!revokeTarget || revoking) return
          setRevoking(true)
          void transactions.revoke(BigInt(revokeTarget.id)).then((result) => {
            toast.success('Lease revoked', { description: result.hash })
            setRevokeTarget(undefined)
          }).catch((cause) => {
            const message = cause instanceof Error ? cause.message : 'The revoke transaction failed.'
            toast.error('Could not revoke lease', { description: message })
          }).finally(() => setRevoking(false))
        }}
      />

      <Card padding="none">
        <div className="flex flex-col gap-3 p-4 pb-0 sm:p-5 sm:pb-0 lg:p-6 lg:pb-0">
          <CardHeader title="Your leases" className="mb-0" />
          <div role="tablist" aria-label="Filter leases by status" className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                type="button"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-0 rounded-control px-2 text-label transition-colors sm:h-11 sm:min-h-0 sm:flex-row sm:gap-2 sm:px-4',
                  filter === f.id ? 'bg-brand-navy text-white' : 'bg-brand-mist text-ink-soft hover:text-ink',
                )}
              >
                {f.label}
                <span className="num text-support opacity-80">{count(f.id)}</span>
              </button>
            ))}
          </div>
        </div>
        <DataTable
          caption="Leases"
          columns={columns}
          rows={rows}
          getRowId={(r) => r.lease.id}
          loading={source.state === 'loading'}
          error={source.state === 'error' ? source.reason : undefined}
          empty={
            <SourceEmpty
              state={source.state}
              reason={source.reason}
              subject="Leases"
              icon={KeyRound}
              readyTitle={filter === 'all' ? 'No leases yet' : `No ${filter} leases`}
              readyDescription="Create a lease to give an agent a spending limit."
            />
          }
        />
      </Card>

      <section aria-labelledby="lease-detail-heading" className="space-y-3">
        <div>
          <h2 id="lease-detail-heading" className="text-section">Lease detail</h2>
          <p className="text-support text-ink-soft">
            {selected ? 'Permissions and actions for the selected lease.' : 'Layout preview. Values appear here when you select a lease.'}
          </p>
        </div>
        <LeaseDetail lease={selected} />
      </section>
    </div>
  )
}
