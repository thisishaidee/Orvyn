import { useMemo, useState } from 'react'
import { isAddress, parseUnits, type Address } from 'viem'
import { toast } from 'sonner'
import { Button, Card, CardHeader, Field, Input, Modal, Notice, Select, StatusBadge } from '@/components/ui'
import { formatUsdc, leaseStatus, remainingAllowance, shortAddress, useDelegateLeases } from '@/lib/agentpay'
import { useAgentPayTransactions } from '@/lib/agentpay-transactions'

export function DelegateSpendPanel() {
  const source = useDelegateLeases()
  const tx = useAgentPayTransactions()
  const activeLeases = useMemo(() => source.items.filter((lease) => leaseStatus(lease) === 'active'), [source.items])
  const [leaseId, setLeaseId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selected = activeLeases.find((lease) => lease.id === leaseId) ?? activeLeases[0]
  const units = /^\d+(\.\d{1,6})?$/.test(amount) ? parseUnits(amount || '0', 6) : 0n
  const available = selected ? remainingAllowance(selected, leaseStatus(selected)) : 0n

  const submit = async () => {
    setError('')
    if (!selected) { setError('No active lease is assigned to this wallet.'); return }
    if (!isAddress(recipient.trim()) || recipient.trim().toLowerCase() === '0x0000000000000000000000000000000000000000') {
      setError('Enter a valid, non-zero recipient address.'); return
    }
    if (units <= 0n) { setError('Enter a positive USDC amount with up to six decimal places.'); return }
    if (units > available) { setError('This payment exceeds the lease’s currently available allowance or balance.'); return }
    setBusy(true)
    try {
      const result = await tx.spend(BigInt(selected.id), recipient.trim() as Address, units)
      toast.success('Payment submitted', { description: result.hash })
      setOpen(false); setRecipient(''); setAmount('')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The payment failed.'
      setError(message)
      toast.error('Payment not completed', { description: message })
    } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader title="Spend from an assigned lease" description="Connect the agent’s delegate wallet on Arc to make a payment. The contract checks the lease owner, delegate, cap, expiry, balance and recipient rules." />
      {source.state !== 'ready' ? (
        <Notice tone={source.state === 'error' ? 'danger' : 'info'} title={source.state === 'missing-address' ? 'Contract address not configured' : source.state === 'unsupported-network' ? 'Unsupported network' : source.state === 'disconnected' ? 'Wallet not connected' : 'Loading assigned leases'}>
          {source.reason}
        </Notice>
      ) : activeLeases.length === 0 ? (
        <Notice tone="info" title="No active leases assigned">
          This connected wallet is not currently the delegate on an active lease. Ask the lease owner to create or fund a lease for this wallet.
        </Notice>
      ) : (
        <div className="space-y-4">
          <Field label="Assigned lease">
            {(props) => <Select {...props} value={selected?.id ?? ''} onChange={(event) => setLeaseId(event.target.value)}>
              {activeLeases.map((lease) => <option key={lease.id} value={lease.id}>Lease {lease.id} · {formatUsdc(lease.cap)} USDC cap · owner {shortAddress(lease.owner)}</option>)}
            </Select>}
          </Field>
          {selected && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-brand-mist p-3">
              <span className="text-support text-ink-soft">Available to spend now</span>
              <strong className="num text-label">{formatUsdc(available)} USDC</strong>
            </div>
          )}
          <Button disabled={tx.state !== 'ready' || !selected || available === 0n} onClick={() => { setError(''); setOpen(true) }}>Make a payment</Button>
        </div>
      )}
      <Modal open={open} onClose={() => { if (!busy) setOpen(false) }} dismissible={!busy} title="Send a lease payment" description="Review the recipient and amount carefully. Your connected delegate wallet must confirm the transaction.">
        <div className="space-y-4">
          <Field label="Recipient address">
            {(props) => <Input {...props} value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="0x…" spellCheck={false} autoCapitalize="none" />}
          </Field>
          <Field label="Amount" hint={selected ? `Maximum available: ${formatUsdc(available)} USDC` : undefined}>
            {(props) => <Input {...props} type="number" min="0.000001" step="0.000001" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="10.00" />}
          </Field>
          {selected && <div className="flex items-center justify-between text-support text-ink-soft"><span>Lease {selected.id}</span><StatusBadge status="active" /></div>}
          {error && <Notice tone="danger" title="Payment not completed">{error}</Notice>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} disabled={tx.state !== 'ready' || !selected || units <= 0n || units > available} onClick={() => void submit()}>Confirm payment</Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
