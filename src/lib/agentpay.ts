import { formatUnits, type Address, type Hex } from 'viem'

/**
 * Domain model for the frontend. These types mirror what the AgentPay contract stores.
 * No data source is connected yet: the hooks below honestly report `not-connected`, and no record
 * is ever invented. When contract reads are wired in, only the two hooks need to change.
 */

export type DataState = 'not-connected' | 'loading' | 'error' | 'ready'

export interface Lease {
  id: string
  owner: Address
  /** The agent: the only address allowed to spend from this lease. */
  delegate: Address
  /** USDC base units (6 decimals). */
  cap: bigint
  periodSeconds: number
  /** Unix seconds. The lease cannot be spent from at or after this time. */
  expiry: number
  spentThisPeriod: bigint
  /** USDC currently held by the lease. */
  balance: bigint
  allowlistEnabled: boolean
  /** The contract can only answer "is X allowed"; this list is rebuilt from AllowlistUpdated events. */
  allowedRecipients?: Address[]
  revoked: boolean
}

export type LeaseStatus = 'active' | 'expired' | 'revoked'

export function leaseStatus(lease: Pick<Lease, 'revoked' | 'expiry'>, nowSeconds = Math.floor(Date.now() / 1000)): LeaseStatus {
  if (lease.revoked) return 'revoked'
  return nowSeconds >= lease.expiry ? 'expired' : 'active'
}

/** min(unused cap this period, lease balance), the same rule the contract applies. */
export function remainingAllowance(lease: Lease, status: LeaseStatus): bigint {
  if (status !== 'active') return 0n
  const unused = lease.cap > lease.spentThisPeriod ? lease.cap - lease.spentThisPeriod : 0n
  return unused < lease.balance ? unused : lease.balance
}

export type ActivityType = 'LeaseCreated' | 'Deposited' | 'Spent' | 'Revoked' | 'Withdrawn'

export interface ActivityItem {
  id: string
  type: ActivityType
  leaseId: string
  agent: Address
  recipient?: Address
  /** USDC base units (6 decimals). */
  amount?: bigint
  /** Unix seconds. */
  timestamp: number
  txHash: Hex
  status: 'success' | 'pending' | 'failed'
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  LeaseCreated: 'Lease created',
  Deposited: 'Funds added',
  Spent: 'Payment sent',
  Revoked: 'Lease revoked',
  Withdrawn: 'Funds withdrawn',
}

export interface DataSource<T> {
  state: DataState
  items: T[]
  /** Plain-language explanation shown when `state` is not `ready`. */
  reason: string
}

const NOT_CONNECTED =
  'This app does not read the AgentPay contract yet, and no contract address is configured here.'

/** Placeholder until contract reads are connected. Always empty, never fabricated. */
export function useLeases(): DataSource<Lease> {
  return { state: 'not-connected', items: [], reason: NOT_CONNECTED }
}

/** Placeholder until contract events are connected. Always empty, never fabricated. */
export function useActivity(): DataSource<ActivityItem> {
  return { state: 'not-connected', items: [], reason: NOT_CONNECTED }
}

/** What the deployed contract can do today. `inApp` flips to true as each action is wired up. */
export const CONTRACT_ACTIONS = [
  { id: 'create', label: 'Create a lease', fn: 'createLease', inContract: true, inApp: false },
  { id: 'deposit', label: 'Add funds to a lease', fn: 'deposit', inContract: true, inApp: false },
  { id: 'allowlist', label: 'Approve or remove a recipient', fn: 'setAllowlist', inContract: true, inApp: false },
  { id: 'revoke', label: 'Revoke a lease', fn: 'revoke', inContract: true, inApp: false },
  { id: 'withdraw', label: 'Withdraw unspent funds', fn: 'withdraw', inContract: true, inApp: false },
  { id: 'spend', label: 'Spend as the agent', fn: 'spend', inContract: true, inApp: false },
] as const

export const ACTION_PENDING_REASON = 'This contract action exists, but the app is not connected to the contract yet.'

// ---- formatting (display only) ----

export function formatUsdc(raw: bigint): string {
  const [whole, fraction = ''] = formatUnits(raw, 6).split('.')
  return `${BigInt(whole).toLocaleString('en-US')}.${fraction.padEnd(2, '0')}`
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatPeriod(seconds: number): string {
  const unit = (size: number, name: string) => {
    const n = seconds / size
    return `${n} ${name}${n === 1 ? '' : 's'}`
  }
  if (seconds % 86400 === 0) return unit(86400, 'day')
  if (seconds % 3600 === 0) return unit(3600, 'hour')
  if (seconds % 60 === 0) return unit(60, 'minute')
  return unit(1, 'second')
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
