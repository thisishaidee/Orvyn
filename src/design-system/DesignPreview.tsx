import { useState, type ReactNode } from 'react'
import { Plus, Trash2, ShieldCheck, Wallet, Clock, Inbox } from 'lucide-react'
import {
  AmountInput,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Modal,
  Notice,
  PageHeader,
  ProgressBar,
  Select,
  Skeleton,
  StatCard,
  StatusBadge,
  SuccessState,
  TransactionList,
  TransactionRow,
  type Column,
} from '@/components/ui'

/**
 * Design-system reference. Every value on this page is a layout placeholder: no blockchain data,
 * balances, addresses or hashes are shown or implied.
 */

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-section text-brand-navy">{title}</h2>
        {description && <p className="text-support text-ink-soft">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const swatches = [
  { name: 'Primary navy', hex: '#17294B', cls: 'bg-brand-navy' },
  { name: 'Primary blue', hex: '#315B91', cls: 'bg-brand-blue' },
  { name: 'Secondary blue', hex: '#6C8FCB', cls: 'bg-brand-sky' },
  { name: 'Pale blue', hex: '#A9C4E8', cls: 'bg-brand-pale' },
  { name: 'Soft surface', hex: '#EAF2FC', cls: 'bg-brand-mist' },
  { name: 'Main background', hex: '#F8FAFD', cls: 'bg-canvas' },
  { name: 'Card', hex: '#FFFFFF', cls: 'bg-surface' },
  { name: 'Primary text', hex: '#263449', cls: 'bg-ink' },
]

interface DemoRow {
  id: string
  label: string
  detail: string
  status: 'active' | 'pending' | 'revoked'
}

const demoRows: DemoRow[] = [
  { id: 'a', label: 'Row label', detail: 'Supporting detail', status: 'active' },
  { id: 'b', label: 'Row label', detail: 'Supporting detail', status: 'pending' },
]

const demoColumns: Column<DemoRow>[] = [
  { key: 'label', header: 'Name', cell: (r) => r.label, primary: true },
  { key: 'detail', header: 'Detail', cell: (r) => <span className="text-ink-soft">{r.detail}</span>, hideOnTablet: true },
  { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  { key: 'amount', header: 'Amount', align: 'right', cell: () => <span className="num text-ink-mute">—</span> },
]

export function DesignPreview() {
  const [amount, setAmount] = useState('')
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState<null | 'primary' | 'destructive'>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Design system"
        title="Foundation components"
        description="Tokens and building blocks for the Orvynn dashboard."
        actions={
          <>
            <Button variant="secondary">Secondary action</Button>
            <Button iconLeft={<Plus className="size-4" aria-hidden />}>Primary action</Button>
          </>
        }
      />
      <Notice tone="info" title="Preview only">
        Values on this page are layout placeholders. Nothing here is live blockchain data.
      </Notice>

      <Section title="Colour tokens" description="Gradients are used sparingly: featured panels and soft page washes.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map((s) => (
            <div key={s.hex} className="min-w-0 overflow-hidden rounded-card border border-line bg-surface">
              <div className={`h-14 ${s.cls}`} />
              <div className="p-3">
                <p className="truncate text-label">{s.name}</p>
                <p className="num text-support text-ink-soft">{s.hex}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-16 rounded-card bg-brand-gradient" />
          <div className="h-16 rounded-card bg-soft-gradient" />
        </div>
      </Section>

      <Section title="Typography" description="Inter with system fallbacks. Figures use tabular numerals.">
        <Card className="space-y-3">
          <p className="text-page-sm md:text-page">Page heading</p>
          <p className="text-section">Section heading</p>
          <p className="text-body">Body text for descriptions and form content.</p>
          <p className="text-support text-ink-soft">Supporting text for hints and secondary detail.</p>
          <p className="text-label">Label text</p>
          <p className="text-overline uppercase text-ink-soft">Overline label</p>
          <p className="num text-figure md:text-figure-lg">0.000000</p>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive" iconLeft={<Trash2 className="size-4" aria-hidden />}>Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-navy-gradient p-4">
          <span className="text-label text-brand-pale">On navy</span>
          <Button variant="inverse">Inverse</Button>
          <Button variant="inverse" disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Cards and statistics">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard tone="featured" label="Featured figure" icon={<Wallet className="size-5" />} hint="Unavailable until data loads" />
          <StatCard label="Unknown value" icon={<ShieldCheck className="size-5" />} hint="Shows a dash when no value exists" />
          <StatCard label="Loading value" icon={<Clock className="size-5" />} loading />
        </div>
      </Section>

      <Section title="Forms">
        <Card className="grid gap-4 md:grid-cols-2">
          <Field label="Text input" hint="Helper text sits below the field.">
            {(c) => <Input placeholder="Placeholder" {...c} />}
          </Field>
          <Field label="Select">
            {(c) => (
              <Select defaultValue="" {...c}>
                <option value="" disabled>Choose an option</option>
                <option>Option one</option>
                <option>Option two</option>
              </Select>
            )}
          </Field>
          <Field label="Invalid input" error="This field needs attention.">
            {(c) => <Input defaultValue="Value" {...c} />}
          </Field>
          <Field label="Amount" hint="Decimal entry, up to 6 places.">
            {(c) => <AmountInput value={amount} onValueChange={setAmount} {...c} />}
          </Field>
        </Card>
      </Section>

      <Section title="Badges and progress">
        <Card className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="active" />
            <StatusBadge status="pending" />
            <StatusBadge status="success" />
            <StatusBadge status="expired" />
            <StatusBadge status="revoked" />
            <StatusBadge status="failed" />
            <Badge tone="info">Info</Badge>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <ProgressBar label="Brand fill (illustrative)" valueLabel="35%" value={35} max={100} />
            <ProgressBar label="Auto: nearing limit (illustrative)" valueLabel="85%" value={85} max={100} tone="auto" />
            <ProgressBar label="Auto: at limit (illustrative)" valueLabel="100%" value={100} max={100} tone="auto" />
            <ProgressBar label="Empty" valueLabel="0%" value={0} max={100} />
          </div>
        </Card>
      </Section>

      <Section title="Tables and transaction rows" description="Real table from tablet up, stacked cards on mobile.">
        <Card padding="none">
          <CardHeader title="Table" className="px-4 pt-4 sm:px-5 sm:pt-5 lg:px-6 lg:pt-6" />
          <DataTable columns={demoColumns} rows={demoRows} getRowId={(r) => r.id} caption="Example table" />
        </Card>
        <Card padding="none">
          <TransactionList label="Example transaction rows">
            <TransactionRow title="Transaction title" subtitle="Reference text" amount="—" status="pending" />
            <TransactionRow title="Incoming example" subtitle="Reference text" amount="—" direction="in" status="success" />
          </TransactionList>
        </Card>
        <Card padding="none">
          <DataTable columns={demoColumns} rows={[]} getRowId={(r) => r.id} caption="Empty table" />
        </Card>
      </Section>

      <Section title="Dialogs">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => setConfirm('primary')}>Open confirmation</Button>
          <Button variant="destructive" onClick={() => setConfirm('destructive')}>Open destructive confirmation</Button>
        </div>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title="Modal title"
          description="Bottom sheet on mobile, centred dialog from tablet up."
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
              <Button onClick={() => setModal(false)}>Continue</Button>
            </>
          }
        >
          <Field label="Example field">{(c) => <Input {...c} />}</Field>
        </Modal>
        <ConfirmDialog
          open={confirm !== null}
          tone={confirm ?? 'primary'}
          title={confirm === 'destructive' ? 'Confirm a destructive action' : 'Confirm this action'}
          description="Describe the real consequence here before the user confirms."
          confirmLabel={confirm === 'destructive' ? 'Confirm' : 'Continue'}
          loading={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setBusy(true)
            window.setTimeout(() => {
              setBusy(false)
              setConfirm(null)
            }, 800)
          }}
        />
      </Section>

      <Section title="States">
        <div className="grid gap-4 md:grid-cols-2">
          <Card><LoadingState title="Loading" description="Fetching the latest data." /></Card>
          <Card><ErrorState message="Explain what failed and how to recover." onRetry={() => undefined} /></Card>
          <Card><SuccessState title="Success" message="Confirm what completed." /></Card>
          <Card><EmptyState icon={Inbox} title="Nothing here yet" description="Explain what appears here and how to start." action={<Button>Primary action</Button>} /></Card>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Section>
    </div>
  )
}
