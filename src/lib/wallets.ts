import { useConnectors } from 'wagmi'
import type { Connector } from 'wagmi'

/** Name of the environment variable that enables WalletConnect. Its value is a public project ID. */
export const WALLETCONNECT_ENV_VAR = 'VITE_WALLETCONNECT_PROJECT_ID'

export type WalletKind = 'detected' | 'generic' | 'walletconnect' | 'coinbase'

export interface WalletOption {
  connector: Connector
  kind: WalletKind
  name: string
  /** Icon announced by the wallet itself (EIP-6963). Absent for wallets that do not provide one. */
  icon?: string
}

export interface WalletOptions {
  /** Wallets that announced themselves through EIP-6963. Only wallets actually present appear here. */
  detected: WalletOption[]
  /** An unnamed injected provider (window.ethereum) when no wallet announced itself. */
  generic?: WalletOption
  walletConnect?: WalletOption
  coinbase?: WalletOption
  /** False when no WalletConnect project ID is configured. */
  walletConnectConfigured: boolean
}

// Truthiness, not `'ethereum' in window`: some pages define the key with an undefined value.
const hasInjectedProvider = (): boolean => typeof window !== 'undefined' && Boolean((window as { ethereum?: unknown }).ethereum)

/**
 * Sorts the connectors wagmi knows about into the groups the connect window shows.
 * wagmi adds EIP-6963 wallets to the connector list as they announce themselves, so this stays current
 * when an extension loads late. The generic injected connector is hidden whenever a named wallet exists,
 * which stops one wallet appearing twice.
 */
export function useWalletOptions(): WalletOptions {
  const connectors = useConnectors()
  const detected: WalletOption[] = []
  let generic: WalletOption | undefined
  let walletConnect: WalletOption | undefined
  let coinbase: WalletOption | undefined

  for (const connector of connectors) {
    const base = { connector, name: connector.name, icon: connector.icon }
    if (connector.type === 'walletConnect') walletConnect = { ...base, kind: 'walletconnect' }
    else if (connector.type === 'coinbaseWallet') coinbase = { ...base, kind: 'coinbase', name: 'Coinbase Wallet' }
    else if (connector.type === 'injected' && connector.id === 'injected') {
      if (hasInjectedProvider()) generic = { ...base, kind: 'generic', name: 'Browser wallet' }
    } else if (connector.type === 'injected') detected.push({ ...base, kind: 'detected' })
  }

  detected.sort((a, b) => a.name.localeCompare(b.name))
  return {
    detected,
    generic: detected.length === 0 ? generic : undefined,
    walletConnect,
    coinbase,
    walletConnectConfigured: walletConnect !== undefined,
  }
}

/** Turns a wagmi, wallet or WalletConnect error into one plain sentence for the user. */
export function describeConnectError(error: unknown): string {
  const e = (error ?? {}) as { name?: string; code?: number; shortMessage?: string; message?: string; cause?: { code?: number } }
  const code = e.code ?? e.cause?.code
  const text = `${e.name ?? ''} ${e.shortMessage ?? ''} ${e.message ?? ''}`.toLowerCase()

  if (code === 4001 || text.includes('reject') || text.includes('denied') || text.includes('cancel')) {
    return 'The request was rejected in your wallet. Nothing changed. Try again when you are ready.'
  }
  if (code === -32002 || text.includes('already pending') || text.includes('already processing')) {
    return 'Your wallet already has a connection request open. Open the wallet and approve or dismiss it, then try again.'
  }
  if (text.includes('providernotfound') || text.includes('provider not found')) {
    return 'That wallet is not available in this browser. Open this page in the wallet app, or choose another option.'
  }
  if (text.includes('project') && (text.includes('not found') || text.includes('invalid') || text.includes('unauthorized'))) {
    return `WalletConnect did not accept the project ID. Check ${WALLETCONNECT_ENV_VAR} in Reown Cloud and restart the app.`
  }
  if (text.includes('subscribe') || text.includes('relay') || text.includes('websocket') || text.includes('interrupted')) {
    return `Could not reach the WalletConnect network. Check your internet connection and that ${WALLETCONNECT_ENV_VAR} is a valid project ID, then try again.`
  }
  if (text.includes('expired') || text.includes('timed out') || text.includes('timeout')) {
    return 'The connection request timed out. Start again and approve it in your wallet.'
  }
  return e.shortMessage ?? 'The wallet could not be connected. Try again or choose another wallet.'
}
