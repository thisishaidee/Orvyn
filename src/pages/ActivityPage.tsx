import { History } from 'lucide-react'
import { Card, CardHeader, DataTable, PageHeader, StatusBadge, type Column } from '@/components/ui'
import { NotConnectedNotice } from '@/components/agentpay/Notices'
import { SourceEmpty } from '@/components/agentpay/SourceEmpty'
import {
  ACTIVITY_LABELS,
  formatDateTime,
  formatUsdc,
  shortAddress,
  useActivity,
  type ActivityItem,
  type ActivityType,
} from '@/lib/agentpay'

const columns: Column<ActivityItem>[] = [
  { key: 'type', header: 'Type', primary: true, cell: (a) => ACTIVITY_LABELS[a.type] },
  {
    key: 'who',
    header: 'Agent / lease',
    cell: (a) => (
      <span className="flex flex-col">
        <span className="num font-mono text-support" title={a.agent}>{shortAddress(a.agent)}</span>
        <span className="text-support text-ink-soft">Lease {a.leaseId}</span>
      </span>
    ),
  },
  {
    key: 'recipient',
    header: 'Recipient',
    hideOnTablet: true,
    cell: (a) => (a.recipient ? <span className="num font-mono text-support" title={a.recipient}>{shortAddress(a.recipient)}</span> : <span className="text-ink-mute">—</span>),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    cell: (a) => (a.amount === undefined ? <span className="text-ink-mute">—</span> : <span className="num">{formatUsdc(a.amount)} USDC</span>),
  },
  { key: 'date', header: 'Date', cell: (a) => formatDateTime(a.timestamp) },
  { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status === 'success' ? 'success' : a.status === 'failed' ? 'failed' : 'pending'} /> },
]

const TRACKED: ActivityType[] = ['LeaseCreated', 'Deposited', 'Spent', 'Revoked', 'Withdrawn']

export function ActivityPage() {
  const source = useActivity()

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Activity"
        title="Activity"
        description="A record of everything that happened on your leases: payments, deposits, withdrawals and revocations."
      />
      <NotConnectedNotice subject="Activity" />

      <Card padding="none">
        <div className="p-4 pb-0 sm:p-5 sm:pb-0 lg:p-6 lg:pb-0">
          <CardHeader title="Transaction history" className="mb-0" />
        </div>
        <DataTable
          caption="Transaction history"
          columns={columns}
          rows={source.items}
          getRowId={(a) => a.id}
          loading={source.state === 'loading'}
          error={source.state === 'error' ? source.reason : undefined}
          empty={
            <SourceEmpty
              state={source.state}
              reason={source.reason}
              subject="Activity"
              verb="is"
              icon={History}
              readyTitle="No activity yet"
              readyDescription="Payments, deposits and withdrawals on your leases will be listed here."
            />
          }
        />
      </Card>

      <Card tone="soft">
        <CardHeader title="What will be recorded" description="Each of these contract events becomes a row in the history." className="mb-3" />
        <ul className="flex flex-wrap gap-2">
          {TRACKED.map((t) => (
            <li key={t} className="rounded-full bg-surface px-3 py-1.5 text-label text-ink shadow-card">
              {ACTIVITY_LABELS[t]}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
