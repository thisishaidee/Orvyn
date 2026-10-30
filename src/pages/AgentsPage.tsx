import { useMemo } from 'react'
import { Bot, UserPlus } from 'lucide-react'
import { Badge, Card, CardHeader, DataTable, PageHeader, StatusBadge, type Column } from '@/components/ui'
import { NotConnectedNotice, PendingAction } from '@/components/agentpay/Notices'
import { SourceEmpty } from '@/components/agentpay/SourceEmpty'
import { leaseStatus, shortAddress, useLeases, type Lease } from '@/lib/agentpay'

interface AgentRow {
  address: string
  leases: Lease[]
  canSpend: boolean
}

const STEPS = [
  'You create a lease that names the agent’s wallet address.',
  'You set a spending cap, a period, an expiry and, if you want, an approved recipient list.',
  'The agent can spend only within those rules. You can revoke at any time.',
]

export function AgentsPage() {
  const source = useLeases()

  // The contract has no agent registry: an agent is simply the delegate address on a lease.
  const agents = useMemo<AgentRow[]>(() => {
    const map = new Map<string, Lease[]>()
    for (const lease of source.items) map.set(lease.delegate, [...(map.get(lease.delegate) ?? []), lease])
    return [...map].map(([address, leases]) => ({ address, leases, canSpend: leases.some((l) => leaseStatus(l) === 'active') }))
  }, [source.items])

  const columns: Column<AgentRow>[] = [
    {
      key: 'agent',
      header: 'Agent',
      primary: true,
      cell: () => (
        <span className="flex flex-col">
          <span>Unnamed agent</span>
          <span className="text-support font-normal text-ink-soft">Identified by wallet address</span>
        </span>
      ),
    },
    { key: 'address', header: 'Wallet address', cell: (a) => <span className="num font-mono text-support" title={a.address}>{shortAddress(a.address)}</span> },
    {
      key: 'lease',
      header: 'Lease',
      cell: (a) => (a.leases.length === 1 ? `Lease ${a.leases[0].id}` : `${a.leases.length} leases`),
    },
    {
      key: 'status',
      header: 'Spending status',
      cell: (a) => (a.canSpend ? <StatusBadge status="active" /> : <Badge tone="neutral">Cannot spend</Badge>),
    },
  ]

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Agents"
        title="Agents"
        description="An agent is an AI program with its own wallet address. You give it a lease so it can pay within limits you set."
        actions={<PendingAction iconLeft={<UserPlus className="size-4" aria-hidden />}>Authorize an agent</PendingAction>}
      />
      <NotConnectedNotice subject="Agents" />

      <Card>
        <CardHeader title="How agents work in AgentPay" />
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-body">
              <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-mist text-label text-brand-blue" aria-hidden>
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-support text-ink-soft">
          The contract stores agent addresses only, so an agent appears here once a lease names it. Names will be labels kept in this app.
        </p>
      </Card>

      <Card padding="none">
        <div className="p-4 pb-0 sm:p-5 sm:pb-0 lg:p-6 lg:pb-0">
          <CardHeader title="Your agents" className="mb-0" />
        </div>
        <DataTable
          caption="Agents"
          columns={columns}
          rows={agents}
          getRowId={(a) => a.address}
          loading={source.state === 'loading'}
          error={source.state === 'error' ? source.reason : undefined}
          empty={
            <SourceEmpty
              state={source.state}
              reason={source.reason}
              subject="Agents"
              icon={Bot}
              readyTitle="No agents yet"
              readyDescription="Authorize an agent by creating a lease for its wallet address."
            />
          }
        />
      </Card>
    </div>
  )
}
