/**
 * Event log retrieval starting at the contract's deployment block.
 * Scanning before deployment wastes RPC requests and can exceed provider limits.
 * Incomplete coverage is an error, never a silent partial result.
 */
import type { Address, PublicClient } from 'viem'
import { agentPayAbi } from '@/lib/agentpay-abi'

const CHUNK = 9_000n
const MAX_CHUNKS = 1_000

export type LogQuery = {
  address: Address
  event: (typeof agentPayAbi)[number]
  args?: Record<string, unknown>
  fromBlock: bigint
}

export async function getLogsChunked(client: PublicClient, params: LogQuery) {
  const { fromBlock: startBlock, ...query } = params
  const latest = await client.getBlockNumber()
  if (startBlock > latest) return []

  const logs: Awaited<ReturnType<typeof client.getLogs>> = []
  let from = startBlock
  let chunks = 0
  while (from <= latest && chunks < MAX_CHUNKS) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n
    const batch = await client.getLogs({ ...query, fromBlock: from, toBlock: to } as never)
    logs.push(...batch)
    chunks += 1
    if (to === latest) return logs
    from = to + 1n
  }

  throw new Error(
    `Incomplete event history: stopped after ${chunks} ranges of ${CHUNK} blocks before block ${latest}. Results were not treated as complete.`,
  )
}
