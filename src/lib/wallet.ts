/**
 * Wallet helpers for AgentPay external wallet support.
 */

import type { Address } from 'viem'
import { isSupportedChain, type SupportedChainId } from '../config'

export function shortenAddress(address: Address | string | undefined, chars = 4): string {
  if (!address) return ''
  const a = address.toLowerCase()
  return `${a.slice(0, 2 + chars)}…${a.slice(-chars)}`
}

export function formatChainStatus(
  isConnected: boolean,
  chainId: number | undefined,
): 'disconnected' | 'unsupported' | 'supported' {
  if (!isConnected) return 'disconnected'
  if (!isSupportedChain(chainId)) return 'unsupported'
  return 'supported'
}

export type { SupportedChainId }
