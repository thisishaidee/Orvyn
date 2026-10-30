import { useState } from 'react'
import { isAddress, parseUnits, type Address } from 'viem'
import { toast } from 'sonner'
import { Button, Card, CardHeader, ConfirmDialog, Field, Input, Modal, Notice, ProgressBar, Select, StatusBadge } from '@/components/ui'
import { InfoList, InfoRow, SupportChips } from '@/components/agentpay/Notices'
import { formatDateTime, formatPeriod, formatUsdc, leaseStatus, remainingAllowance, shortAddress, type Lease } from '@/lib/agentpay'
import { useAgentPayTransactions } from '@/lib/agentpay-transactions'

const Dash = () => <span className="text-ink-mute" aria-label="Not available">—</span>

function PermissionRow({ label, children, hint, inContract = true, inApp = true }: { label: string; children: React.ReactNode; hint?: React.ReactNode; inContract?: boolean; inApp?: boolean }) {
  return (
    <InfoRow label={label} hint={hint}>
      <span className="flex flex-col gap-1.5 md:items-end">
        <span>{children}</span>
        <SupportChips inContract={inContract} inApp={inApp} />
      </span>
    </InfoRow>
  )
}

export function PermissionsSection({ lease }: { lease?: Lease }) {
  const status = lease ? leaseStatus(lease) : undefined
  return (
    <Card>
      <CardHeader title="Permissions" description="What the agent is allowed to do under this lease. The contract enforces these rules." />
      <InfoList>
        <PermissionRow label="Per-period spending cap">{lease ? <span className="num">{formatUsdc(lease.cap)} USDC</span> : <Dash />}</PermissionRow>
        <PermissionRow label="Spending period" hint="The cap resets automatically at the start of each period.">{lease ? formatPeriod(lease.periodSeconds) : <Dash />}</PermissionRow>
        <PermissionRow label="Expiry">{lease ? formatDateTime(lease.expiry) : <Dash />}</PermissionRow>
        <PermissionRow label="Recipient allowlist">{lease ? (lease.allowlistEnabled ? 'On: only approved recipients' : 'Off: any recipient') : <Dash />}</PermissionRow>
        <PermissionRow label="Approved recipients" hint="This list is reconstructed from the contract's AllowlistUpdated events.">
          {lease?.allowedRecipients?.length ? (
            <ul className="space-y-1">{lease.allowedRecipients.map((a) => <li key={a} className="num font-mono text-support" title={a}>{shortAddress(a)}</li>)}</ul>
          ) : <Dash />}
        </PermissionRow>
        <PermissionRow label="Revocation">{status ? (status === 'revoked' ? 'Revoked: the agent can no longer spend' : 'Not revoked') : <Dash />}</PermissionRow>
      </InfoList>
    </Card>
  )
}

export function LeaseDetail({ lease }: { lease?: Lease }) {
  const tx = useAgentPayTransactions()
  const status = lease ? leaseStatus(lease) : undefined
  const remaining = lease && status ? remainingAllowance(lease, status) : undefined
  const [action, setAction] = useState<'deposit' | 'recipient' | null>(null)
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [allowed, setAllowed] = useState('true')
  const [busy, setBusy] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [error, setError] = useState('')

  const closeAction = () => {
    if (busy) return
    setAction(null); setAmount(''); setRecipient(''); setAllowed('true'); setError('')
  }
  const submitDeposit = async () => {
    if (!lease) return
    setError('')
    if (!/^\d+(\.\d{1,6})?$/.test(amount) || parseUnits(amount || '0', 6) <= 0n) {
      setError('Enter a positive USDC amount with up to six decimal places.'); return
    }
    const units = parseUnits(amount, 6)
    setBusy(true)
    try {
      const allowance = await tx.getUsdcAllowance()
      if (allowance < units) {
        await tx.approveUsdc(units)
        toast.success('USDC approval confirmed', { description: 'Now confirm the separate lease deposit transaction.' })
      }
      const result = await tx.deposit(BigInt(lease.id), units)
      toast.success('Lease funded', { description: result.hash })
      closeAction()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The deposit failed.'
      setError(message); toast.error('Could not fund lease', { description: message })
    } finally { setBusy(false) }
  }
  const submitRecipient = async () => {
    if (!lease) return
    setError('')
    if (!isAddress(recipient.trim()) || recipient.trim().toLowerCase() === '0x0000000000000000000000000000000000000000') {
      setError('Enter a valid, non-zero recipient address.'); return
    }
    setBusy(true)
    try {
      const result = await tx.setAllowlist(BigInt(lease.id), recipient.trim() as Address, allowed === 'true')
      toast.success(allowed === 'true' ? 'Recipient approved' : 'Recipient removed', { description: result.hash })
      closeAction()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The recipient update failed.'
      setError(message); toast.error('Could not update recipient', { description: message })
    } finally { setBusy(false) }
  }
  const confirmRevoke = async () => {
    if (!lease || busy) return
    setBusy(true)
    try {
      const result = await tx.revoke(BigInt(lease.id))
      toast.success('Lease revoked', { description: result.hash })
      setRevokeOpen(false)
    } catch (cause) {
      toast.error('Could not revoke lease', { description: cause instanceof Error ? cause.message : 'The revoke transaction failed.' })
    } finally { setBusy(false) }
  }
  const confirmWithdraw = async () => {
    if (!lease || busy) return
    setBusy(true)
    try {
      const result = await tx.withdraw(BigInt(lease.id))
      toast.success('Lease funds withdrawn', { description: result.hash })
      setWithdrawOpen(false)
    } catch (cause) {
      toast.error('Could not withdraw funds', { description: cause instanceof Error ? cause.message : 'The withdrawal failed.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={lease ? `Lease ${lease.id}` : 'No lease selected'} description={lease ? <>Agent <span className="num font-mono">{shortAddress(lease.delegate)}</span></> : 'Select a lease from the list to see its details.'} action={status ? <StatusBadge status={status} /> : undefined} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-label text-ink-soft">Spent this period</p><p className="num mt-1 text-figure-sm">{lease ? `${formatUsdc(lease.spentThisPeriod)} USDC` : <Dash />}</p></div>
          <div><p className="text-label text-ink-soft">Remaining allowance</p><p className="num mt-1 text-figure-sm">{remaining !== undefined ? `${formatUsdc(remaining)} USDC` : <Dash />}</p></div>
          <div><p className="text-label text-ink-soft">Funds in lease</p><p className="num mt-1 text-figure-sm">{lease ? `${formatUsdc(lease.balance)} USDC` : <Dash />}</p></div>
        </div>
        {lease && <ProgressBar className="mt-5" label="Period spending" valueLabel={`${formatUsdc(lease.spentThisPeriod)} of ${formatUsdc(lease.cap)} USDC`} value={Number(lease.spentThisPeriod)} max={Number(lease.cap)} tone="auto" />}
      </Card>
      <PermissionsSection lease={lease} />
      <Card>
        <CardHeader title="Actions" description="Transactions are submitted only after you confirm them in your wallet." />
        {!lease ? <p className="text-support text-ink-soft">Select a lease to manage its funds and recipients.</p> : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variant="secondary" disabled={tx.state !== 'ready'} onClick={() => setAction('deposit')}>Add funds</Button>
            <Button variant="secondary" disabled={tx.state !== 'ready' || !lease.allowlistEnabled} onClick={() => setAction('recipient')}>Manage recipients</Button>
            <Button variant="secondary" disabled={tx.state !== 'ready' || lease.balance === 0n} onClick={() => setWithdrawOpen(true)}>Withdraw funds</Button>
            <Button variant="destructive" disabled={tx.state !== 'ready' || status !== 'active'} onClick={() => setRevokeOpen(true)}>Revoke lease</Button>
          </div>
        )}
        {tx.state !== 'ready' && <p className="mt-3 text-support text-ink-soft">{tx.reason || 'Connect a wallet on an Arc network with a deployed AgentPay contract.'}</p>}
      </Card>

      <Modal open={action === 'deposit'} onClose={closeAction} dismissible={!busy} title="Add funds" description="USDC approval and the lease deposit are separate wallet transactions.">
        <div className="space-y-4">
          <Field label="Deposit amount" hint="USDC, up to six decimal places.">
            {(props) => <Input {...props} type="number" min="0.000001" step="0.000001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50.00" />}
          </Field>
          {error && <Notice tone="danger" title="Deposit not completed">{error}</Notice>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" disabled={busy} onClick={closeAction}>Cancel</Button>
            <Button loading={busy} disabled={tx.state !== 'ready'} onClick={() => void submitDeposit()}>Continue</Button>
          </div>
        </div>
      </Modal>

      <Modal open={action === 'recipient'} onClose={closeAction} dismissible={!busy} title="Manage recipient" description="Approve or remove one recipient for this lease.">
        <div className="space-y-4">
          <Field label="Recipient wallet address">{(props) => <Input {...props} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x…" spellCheck={false} autoCapitalize="none" />}</Field>
          <Field label="Permission">{(props) => <Select {...props} value={allowed} onChange={(e) => setAllowed(e.target.value)}><option value="true">Approve recipient</option><option value="false">Remove recipient</option></Select>}</Field>
          {error && <Notice tone="danger" title="Recipient update failed">{error}</Notice>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" disabled={busy} onClick={closeAction}>Cancel</Button>
            <Button loading={busy} disabled={tx.state !== 'ready'} onClick={() => void submitRecipient()}>Save permission</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={revokeOpen} title="Revoke this lease?" description="The agent will no longer be able to spend from this lease. This cannot be undone." confirmLabel="Revoke lease" tone="destructive" loading={busy} onCancel={() => { if (!busy) setRevokeOpen(false) }} onConfirm={() => void confirmRevoke()} />
      <ConfirmDialog open={withdrawOpen} title="Withdraw lease funds?" description={lease ? `Withdraw the full remaining balance of ${formatUsdc(lease.balance)} USDC to your connected owner wallet.` : undefined} confirmLabel="Withdraw funds" loading={busy} onCancel={() => { if (!busy) setWithdrawOpen(false) }} onConfirm={() => void confirmWithdraw()} />
    </div>
  )
}
