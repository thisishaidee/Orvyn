/**
 * Read-only AgentPay contract access.
 * Discovers leases from LeaseCreated events filtered by owner, then reads
 * current state. Does not invent addresses, records, or timestamps.
 */

import { useQuery } from '@tanstack/react-query'
import { type Address, type Hex, type PublicClient } from 'viem'
import { useAccount, usePublicClient, useReadContract } from 'wagmi'
import { isSupportedChain } from '@/config'
import { agentPayAbi } from '@/lib/agentpay-abi'
import { agentPayAddressEnvVar, getAgentPayAddress } from '@/lib/agentpay-address'
import type { ActivityItem, ActivityType, DataSource, Lease } from '@/lib/agentpay'

const CHUNK = 20_000n
const MAX_CHUNKS = 200

export type ReadGate =
  | { ok: false; state: 'disconnected' | 'unsupported-network' | 'missing-address'; reason: string }
  | { ok: true; address: Address; chainId: number; contract: Address; client: PublicClient }

export function useReadGate(): ReadGate {
  const { address, isConnected, chainId } = useAccount()
  const client = usePublicClient({ chainId })
  const contract = getAgentPayAddress(chainId)

  if (!isConnected || !address) {
    return { ok: false, state: 'disconnected', reason: 'Connect a wallet to read AgentPay.' }
  }
  if (!isSupportedChain(chainId)) {
    return { ok: false, state: 'unsupported-network', reason: 'Switch to Arc Mainnet or Arc Testnet to read AgentPay.' }
  }
  if (!contract) {
    const env = agentPayAddressEnvVar(chainId)
    return {
      ok: false,
      state: 'missing-address',
      reason: env
        ? `No AgentPay contract address is configured for this network. Set ${env} after a real deployment.`
        : 'No AgentPay contract address is configured for this network.',
    }
  }
  if (!client) {
    return { ok: false, state: 'disconnected', reason: 'The network client is not ready yet.' }
  }
  return { ok: true, address, chainId, contract, client }
}

type LogQuery = {
  address: Address
  event: (typeof agentPayAbi)[number]
  args?: Record<string, unknown>
}

async function getLogsChunked(client: PublicClient, params: LogQuery) {
  const call = (fromBlock: bigint, toBlock: bigint | 'latest') =>
    client.getLogs({ ...params, fromBlock, toBlock } as never)

  try {
    return await call(0n, 'latest')
  } catch {
    // Fall back to block-range pagination when the RPC rejects a full-range query.
  }

  const latest = await client.getBlockNumber()
  const logs: Awaited<ReturnType<typeof call>> = []
  let from = 0n
  let chunks = 0
  while (from <= latest && chunks < MAX_CHUNKS) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n
    const batch = await call(from, to)
    logs.push(...batch)
    if (to === latest) break
    from = to + 1n
    chunks += 1
  }
  return logs
}

async function blockTimestamps(client: PublicClient, blocks: bigint[]): Promise<Map<string, number>> {
  const unique = [...new Set(blocks.map((b) => b.toString()))]
  const map = new Map<string, number>()
  const concurrency = 6
  for (let i = 0; i < unique.length; i += concurrency) {
    const slice = unique.slice(i, i + concurrency)
    await Promise.all(
      slice.map(async (bn) => {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(bn) })
          map.set(bn, Number(block.timestamp))
        } catch {
          // Timestamp unavailable for this block. Leave it out rather than invent one.
        }
      }),
    )
  }
  return map
}

type LeaseTuple = readonly [
  Address, Address, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean,
]

function toLease(id: bigint, row: LeaseTuple, remaining: bigint, allowed: Address[]): Lease {
  return {
    id: id.toString(),
    owner: row[0],
    delegate: row[1],
    cap: row[2],
    periodSeconds: Number(row[3]),
    expiry: Number(row[4]),
    spentThisPeriod: row[7],
    balance: row[8],
    allowlistEnabled: row[9],
    revoked: row[10],
    allowedRecipients: allowed,
    onChainRemaining: remaining,
  }
}

async function discoverLeases(client: PublicClient, contract: Address, owner: Address): Promise<Lease[]> {
  const created = await getLogsChunked(client, {
    address: contract,
    event: {
      type: 'event',
      name: 'LeaseCreated',
      inputs: agentPayAbi.find((x) => x.type === 'event' && x.name === 'LeaseCreated')!.inputs,
    } as never,
    args: { owner },
  })

  const ids = [...new Set(created.map((log) => (log as unknown as { args: { leaseId?: bigint } }).args.leaseId).filter((id): id is bigint => id !== undefined))]
  if (ids.length === 0) return []

  const allowlistLogs = await getLogsChunked(client, {
    address: contract,
    event: {
      type: 'event',
      name: 'AllowlistUpdated',
      inputs: agentPayAbi.find((x) => x.type === 'event' && x.name === 'AllowlistUpdated')!.inputs,
    } as never,
    args: { leaseId: ids.length === 1 ? ids[0] : undefined },
  }).catch(() => [])

  const allowedByLease = new Map<string, Map<string, boolean>>()
  for (const log of allowlistLogs) {
    const args = (log as unknown as { args: { leaseId?: bigint; recipient?: Address; allowed?: boolean } }).args
    if (args.leaseId === undefined || !args.recipient) continue
    const key = args.leaseId.toString()
    const set = allowedByLease.get(key) ?? new Map<string, boolean>()
    set.set(args.recipient.toLowerCase(), Boolean(args.allowed))
    allowedByLease.set(key, set)
  }

  const leases = await Promise.all(
    ids.map(async (id) => {
      const [row, remaining] = await Promise.all([
        client.readContract({ address: contract, abi: agentPayAbi, functionName: 'leases', args: [id] }) as Promise<LeaseTuple>,
        client.readContract({ address: contract, abi: agentPayAbi, functionName: 'remainingAllowance', args: [id] }) as Promise<bigint>,
      ])
      const permissions = allowedByLease.get(id.toString())
      const allowed = permissions
        ? [...permissions.entries()].filter(([, on]) => on).map(([addr]) => addr as Address)
        : []
      return toLease(id, row, remaining, allowed)
    }),
  )

  return leases.sort((a, b) => Number(b.id) - Number(a.id))
}

export function useNextLeaseId() {
  const gate = useReadGate()
  return useReadContract({
    address: gate.ok ? gate.contract : undefined,
    abi: agentPayAbi,
    functionName: 'nextLeaseId',
    query: { enabled: gate.ok },
  })
}

export function useLeaseRecord(id: bigint | undefined) {
  const gate = useReadGate()
  return useReadContract({
    address: gate.ok ? gate.contract : undefined,
    abi: agentPayAbi,
    functionName: 'leases',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: gate.ok && id !== undefined },
  })
}

export function useRemainingAllowance(id: bigint | undefined) {
  const gate = useReadGate()
  return useReadContract({
    address: gate.ok ? gate.contract : undefined,
    abi: agentPayAbi,
    functionName: 'remainingAllowance',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: gate.ok && id !== undefined },
  })
}

export function useAllowedRecipient(id: bigint | undefined, recipient: Address | undefined) {
  const gate = useReadGate()
  return useReadContract({
    address: gate.ok ? gate.contract : undefined,
    abi: agentPayAbi,
    functionName: 'allowedRecipients',
    args: id !== undefined && recipient ? [id, recipient] : undefined,
    query: { enabled: gate.ok && id !== undefined && Boolean(recipient) },
  })
}

export function useOwnerLeases(): DataSource<Lease> {
  const gate = useReadGate()
  const query = useQuery({
    queryKey: ['agentpay', 'leases', gate.ok ? gate.chainId : 0, gate.ok ? gate.contract : 'none', gate.ok ? gate.address : 'none'],
    enabled: gate.ok,
    queryFn: () => {
      if (!gate.ok) return []
      return discoverLeases(gate.client, gate.contract, gate.address)
    },
  })

  if (!gate.ok) return { state: gate.state, items: [], reason: gate.reason }
  if (query.isPending) return { state: 'loading', items: [], reason: 'Reading leases from the AgentPay contract.' }
  if (query.isError) {
    return { state: 'error', items: [], reason: query.error instanceof Error ? query.error.message : 'The lease read failed.' }
  }
  return { state: 'ready', items: query.data ?? [], reason: '' }
}

function eventAbi(name: string) {
  const found = agentPayAbi.find((item) => item.type === 'event' && item.name === name)
  if (!found || found.type !== 'event') throw new Error(`Missing event ${name}`)
  return found
}

async function discoverActivity(
  client: PublicClient,
  contract: Address,
  owner: Address,
  leases: Lease[],
): Promise<ActivityItem[]> {
  const leaseIds = leases.map((l) => BigInt(l.id))
  const byId = new Map(leases.map((l) => [l.id, l]))

  const [created, deposited, withdrawn, spent, revoked, allowlist] = await Promise.all([
    getLogsChunked(client, { address: contract, event: eventAbi('LeaseCreated') as never, args: { owner } }),
    getLogsChunked(client, { address: contract, event: eventAbi('Deposited') as never, args: { owner } }),
    getLogsChunked(client, { address: contract, event: eventAbi('Withdrawn') as never, args: { owner } }),
    leaseIds.length
      ? getLogsChunked(client, { address: contract, event: eventAbi('Spent') as never })
      : Promise.resolve([]),
    leaseIds.length
      ? getLogsChunked(client, { address: contract, event: eventAbi('Revoked') as never })
      : Promise.resolve([]),
    leaseIds.length
      ? getLogsChunked(client, { address: contract, event: eventAbi('AllowlistUpdated') as never })
      : Promise.resolve([]),
  ])

  const owned = new Set(leaseIds.map((id) => id.toString()))
  const relevant = [...created, ...deposited, ...withdrawn, ...spent, ...revoked, ...allowlist].filter((log) => {
    const leaseId = (log as { args?: { leaseId?: bigint } }).args?.leaseId
    return leaseId !== undefined && owned.has(leaseId.toString())
  })

  const times = await blockTimestamps(client, relevant.map((log) => log.blockNumber).filter((n): n is bigint => n !== null))

  const items: ActivityItem[] = relevant.map((entry) => {
    const log = entry as {
      args?: {
        leaseId?: bigint
        owner?: Address
        delegate?: Address
        recipient?: Address
        amount?: bigint
        allowed?: boolean
      }
      eventName?: string
      blockNumber: bigint | null
      transactionHash: Hex | null
      logIndex: number | null
    }
    const args = (log.args ?? {}) as {
      leaseId?: bigint
      owner?: Address
      delegate?: Address
      recipient?: Address
      amount?: bigint
      allowed?: boolean
    }
    const leaseId = args.leaseId?.toString() ?? '0'
    const lease = byId.get(leaseId)
    const type = (log.eventName ?? 'LeaseCreated') as ActivityType
    const timestamp = log.blockNumber !== null ? times.get(log.blockNumber.toString()) : undefined
    return {
      id: `${log.transactionHash}-${log.logIndex}`,
      type,
      leaseId,
      agent: lease?.delegate ?? args.delegate ?? args.owner ?? owner,
      recipient: args.recipient,
      amount: args.amount,
      timestamp,
      txHash: (log.transactionHash ?? '0x') as Hex,
      status: 'success',
    }
  })

  return items.sort((a, b) => {
    const ta = a.timestamp ?? 0
    const tb = b.timestamp ?? 0
    return tb - ta
  })
}

export function useOwnerActivity(leases: Lease[], leasesReady: boolean): DataSource<ActivityItem> {
  const gate = useReadGate()
  const query = useQuery({
    queryKey: ['agentpay', 'activity', gate.ok ? gate.chainId : 0, gate.ok ? gate.contract : 'none', gate.ok ? gate.address : 'none', leases.map((l) => l.id).join(',')],
    enabled: gate.ok && leasesReady,
    queryFn: () => {
      if (!gate.ok) return []
      return discoverActivity(gate.client, gate.contract, gate.address, leases)
    },
  })

  if (!gate.ok) return { state: gate.state, items: [], reason: gate.reason }
  if (!leasesReady) return { state: 'loading', items: [], reason: 'Waiting for lease discovery before reading activity.' }
  if (query.isPending) return { state: 'loading', items: [], reason: 'Reading activity from the AgentPay contract.' }
  if (query.isError) {
    return { state: 'error', items: [], reason: query.error instanceof Error ? query.error.message : 'The activity read failed.' }
  }
  return { state: 'ready', items: query.data ?? [], reason: '' }
}

/** Activity for the connected owner. Waits for lease discovery so lease IDs are known. */
export function useOwnerActivityQuery(): DataSource<ActivityItem> {
  const leases = useOwnerLeases()
  const ready = leases.state === 'ready'
  return useOwnerActivity(leases.items, ready)
}
