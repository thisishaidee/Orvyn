import type { ReactNode } from 'react'
import { Card, CardHeader, ProgressBar, StatusBadge } from '@/components/ui'
import { InfoList, InfoRow, PendingAction, SupportChips } from '@/components/agentpay/Notices'
import { formatDateTime, formatPeriod, formatUsdc, leaseStatus, remainingAllowance, shortAddress, type Lease } from '@/lib/agentpay'

const Dash = () => (
  <span className="text-ink-mute" aria-label="Not available">
    —
  </span>
)

function PermissionRow({ label, children, hint, inContract = true }: { label: string; children: ReactNode; hint?: ReactNode; inContract?: boolean }) {
  return (
    <InfoRow label={label} hint={hint}>
      <span className="flex flex-col gap-1.5 md:items-end">
        <span>{children}</span>
        {/* The app is not connected to the contract yet, so nothing is "In app". */}
        <SupportChips inContract={inContract} inApp={false} />
      </span>
    </InfoRow>
  )
}

/** The Permissions section of a lease. Permissions belong to a lease; there is no separate Permissions page. */
export function PermissionsSection({ lease }: { lease?: Lease }) {
  const status = lease ? leaseStatus(lease) : undefined
  return (
    <Card>
      <CardHeader
        title="Permissions"
        description="What the agent is allowed to do under this lease. In contract means the contract enforces it. In app means this app can read or change it."
      />
      <InfoList>
        <PermissionRow label="Per-period spending cap">{lease ? <span className="num">{formatUsdc(lease.cap)} USDC</span> : <Dash />}</PermissionRow>
        <PermissionRow label="Spending period" hint="The cap resets automatically at the start of each period.">
          {lease ? formatPeriod(lease.periodSeconds) : <Dash />}
        </PermissionRow>
        <PermissionRow label="Expiry">{lease ? formatDateTime(lease.expiry) : <Dash />}</PermissionRow>
        <PermissionRow label="Recipient allowlist">
          {lease ? (lease.allowlistEnabled ? 'On: only approved recipients' : 'Off: any recipient') : <Dash />}
        </PermissionRow>
        <PermissionRow
          label="Approved recipients"
          hint="The contract can confirm whether one address is approved but cannot list them. The app will rebuild this list from the contract's AllowlistUpdated events."
        >
          {lease?.allowedRecipients?.length ? (
            <ul className="space-y-1">
              {lease.allowedRecipients.map((a) => (
                <li key={a} className="num font-mono text-support" title={a}>
                  {shortAddress(a)}
                </li>
              ))}
            </ul>
          ) : (
            <Dash />
          )}
        </PermissionRow>
        <PermissionRow label="Revocation">
          {status ? (status === 'revoked' ? 'Revoked: the agent can no longer spend' : 'Not revoked') : <Dash />}
        </PermissionRow>
      </InfoList>
    </Card>
  )
}

/** Detail view for one lease. With no lease it renders the same layout with empty values. */
export function LeaseDetail({ lease }: { lease?: Lease }) {
  const status = lease ? leaseStatus(lease) : undefined
  const remaining = lease && status ? remainingAllowance(lease, status) : undefined
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={lease ? `Lease ${lease.id}` : 'No lease selected'}
          description={lease ? <>Agent <span className="num font-mono">{shortAddress(lease.delegate)}</span></> : 'Select a lease from the list to see its details.'}
          action={status ? <StatusBadge status={status} /> : undefined}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-label text-ink-soft">Spent this period</p>
            <p className="num mt-1 text-figure-sm">{lease ? `${formatUsdc(lease.spentThisPeriod)} USDC` : <Dash />}</p>
          </div>
          <div>
            <p className="text-label text-ink-soft">Remaining allowance</p>
            <p className="num mt-1 text-figure-sm">{remaining !== undefined ? `${formatUsdc(remaining)} USDC` : <Dash />}</p>
          </div>
          <div>
            <p className="text-label text-ink-soft">Funds in lease</p>
            <p className="num mt-1 text-figure-sm">{lease ? `${formatUsdc(lease.balance)} USDC` : <Dash />}</p>
          </div>
        </div>
        {lease && (
          <ProgressBar
            className="mt-5"
            label="Period spending"
            valueLabel={`${formatUsdc(lease.spentThisPeriod)} of ${formatUsdc(lease.cap)} USDC`}
            value={Number(lease.spentThisPeriod)}
            max={Number(lease.cap)}
            tone="auto"
          />
        )}
      </Card>

      <PermissionsSection lease={lease} />

      <Card>
        <CardHeader title="Actions" description="These actions exist in the contract. They are disabled because the app is not connected to it yet." />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PendingAction variant="secondary">Add funds</PendingAction>
          <PendingAction variant="secondary">Manage recipients</PendingAction>
          <PendingAction variant="secondary">Withdraw</PendingAction>
          <PendingAction variant="destructive">Revoke lease</PendingAction>
        </div>
      </Card>
    </div>
  )
}
