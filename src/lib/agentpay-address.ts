/**
 * Configurable AgentPay contract address.
 * No deployment address is hardcoded. Set one only after a real deployment:
 *   VITE_AGENTPAY_ADDRESS_MAINNET  — Arc Mainnet (chain ID 5042)
 *   VITE_AGENTPAY_ADDRESS_TESTNET  — Arc Testnet (chain ID 5042002)
 */

import { isAddress, type Address } from 'viem'
import { arc, arcTestnet } from 'viem/chains'

const ENV = import.meta.env as Record<string, string | undefined>

function readAddress(value: string | undefined): Address | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return isAddress(trimmed) ? trimmed : undefined
}

export const AGENTPAY_ADDRESS_ENV = {
  mainnet: 'VITE_AGENTPAY_ADDRESS_MAINNET',
  testnet: 'VITE_AGENTPAY_ADDRESS_TESTNET',
} as const

/** Returns the configured address for the chain, or undefined when none is set. */
export function getAgentPayAddress(chainId: number | undefined): Address | undefined {
  if (chainId === arc.id) return readAddress(ENV[AGENTPAY_ADDRESS_ENV.mainnet])
  if (chainId === arcTestnet.id) return readAddress(ENV[AGENTPAY_ADDRESS_ENV.testnet])
  return undefined
}

export function agentPayAddressEnvVar(chainId: number | undefined): string | undefined {
  if (chainId === arc.id) return AGENTPAY_ADDRESS_ENV.mainnet
  if (chainId === arcTestnet.id) return AGENTPAY_ADDRESS_ENV.testnet
  return undefined
}
