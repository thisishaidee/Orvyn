/**
 * AgentPay network and token configuration.
 * Do not invent contract addresses. USDC is the known Arc USDC address.
 */

import { arc, arcTestnet } from 'viem/chains'

export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const
export const USDC_DECIMALS = 6

export const ARC_MAINNET = arc
export const ARC_TESTNET = arcTestnet

export const SUPPORTED_CHAINS = [ARC_MAINNET, ARC_TESTNET] as const

export const CHAIN_LABELS: Record<number, string> = {
  [ARC_MAINNET.id]: 'Arc Mainnet',
  [ARC_TESTNET.id]: 'Arc Testnet',
}

export function getChainLabel(chainId: number | undefined): string {
  if (!chainId) return 'Unknown network'
  return CHAIN_LABELS[chainId] ?? `Unsupported (${chainId})`
}

export function isArcChain(chainId: number | undefined): boolean {
  return chainId === ARC_MAINNET.id || chainId === ARC_TESTNET.id
}
