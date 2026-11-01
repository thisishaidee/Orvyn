/**
 * wagmi configuration for Orvynn
 * Supported networks: Arc Mainnet (5042) and Arc Testnet (5042002)
 * Built with Arc Studio — https://studio.arc.io
 */

import { fallback, http } from 'viem'
import { createConfig } from 'wagmi'
import { arc, arcTestnet } from 'viem/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'
import { registerChain } from './tracing'
import { BRAND } from './lib/brand'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arc.id, arc.rpcUrls.default.http[0])
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

// Arc's default public RPC can throttle bursts of eth_call requests. Use an
// independent Arc mainnet RPC first, with Circle's endpoint as a fallback.
// Wallet-signed transactions still go through the connected wallet provider.
const arcMainnetTransport = fallback([
  http('https://rpc.arc-scan.org'),
  http(arc.rpcUrls.default.http[0]),
])

// Multi-wallet support:
// - injected(): browser-extension and in-app-browser wallets. wagmi also auto-discovers each installed
//   wallet (MetaMask, OKX Wallet, Trust Wallet, Coinbase extension...) through EIP-6963.
// - coinbaseWallet(): Coinbase Wallet, including its mobile app.
// - walletConnect(): any WalletConnect-compatible mobile wallet. It needs a free project ID from
//   https://cloud.reown.com, supplied as VITE_WALLETCONNECT_PROJECT_ID. The ID is public, not a secret.
//   Without it, WalletConnect is simply left out and nothing else changes.
const walletConnectProjectId = (import.meta.env as Record<string, string | undefined>).VITE_WALLETCONNECT_PROJECT_ID?.trim()

/** True when WalletConnect is configured. Used by the UI to describe which wallets can connect. */
export const walletConnectEnabled = Boolean(walletConnectProjectId)

export const config = createConfig({
  multiInjectedProviderDiscovery: true, // EIP-6963: list every wallet that announces itself
  chains: [arc, arcTestnet],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: BRAND.name,
      preference: 'all',
    }),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: false, // the app draws its own QR code in the connect window
            metadata: { name: BRAND.name, description: BRAND.tagline, url: window.location.origin, icons: [] },
          }),
        ]
      : []),
  ],
  transports: {
    [arc.id]: arcMainnetTransport,
    [arcTestnet.id]: http(),
  },
  ssr: false,
})

export const SUPPORTED_CHAIN_IDS = [arc.id, arcTestnet.id] as const
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number]

export function isSupportedChain(chainId: number | undefined): chainId is SupportedChainId {
  return chainId !== undefined && SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId)
}
