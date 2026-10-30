/**
 * wagmi configuration for AgentPay
 * Supported networks: Arc Mainnet (5042) and Arc Testnet (5042002)
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { arc, arcTestnet } from 'viem/chains'
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arc.id, arc.rpcUrls.default.http[0])
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

// WalletConnect project ID from environment if available; otherwise omit the connector
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined

export const config = createConfig({
  chains: [arc, arcTestnet],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: 'AgentPay',
      preference: 'all', // smart wallet + EOA
    }),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: false, // ConnectKit handles the modal
          }),
        ]
      : []),
  ],
  transports: {
    [arc.id]: http(),
    [arcTestnet.id]: http(),
  },
  ssr: false,
})

export const SUPPORTED_CHAIN_IDS = [arc.id, arcTestnet.id] as const
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number]

export function isSupportedChain(chainId: number | undefined): chainId is SupportedChainId {
  return chainId !== undefined && SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId)
}
