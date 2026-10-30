/**
 * Event log retrieval with a full-range attempt and block-range fallback.
 * Incomplete coverage is an error, never a silent partial result.
 */

import type { Address, PublicClient } from 'viem'
import { agentPayAbi } from '@/lib/agentpay-abi'

const CHUNK = 20_000n
const MAX_CHUNKS = 200

export type LogQuery = {
  address: Address
  event: (typeof agentPayAbi)[number]
  args?: Record<string, unknown>
}

export async function getLogsChunked(client: PublicClient, params: LogQuery) {
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
  let covered = false
  while (from <= latest && chunks < MAX_CHUNKS) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n
    const batch = await call(from, to)
    logs.push(...batch)
    chunks += 1
    if (to === latest) {
      covered = true
      break
    }
    from = to + 1n
  }
  if (!covered) {
    throw new Error(
      `Incomplete event history: stopped after ${chunks} ranges of ${CHUNK} blocks before block ${latest}. Results were not treated as complete.`,
    )
  }
  return logs
}
