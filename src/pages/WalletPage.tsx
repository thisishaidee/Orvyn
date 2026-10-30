import { ConnectKitButton } from 'connectkit'
import { useAccount, useDisconnect } from 'wagmi'
import { NetworkSwitcher } from '@/components/wallet/NetworkSwitcher'
import { shortenAddress } from '@/lib/wallet'
import { isSupportedChain } from '@/config'
import { getChainLabel } from '@/lib/agentpay-config'

export function WalletPage() {
  const { address, isConnected, chainId, status } = useAccount()
  const { disconnect } = useDisconnect()

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Wallet</h1>

      {!isConnected && (
        <div className="space-y-3">
          <p className="text-slate-600">Connect an external wallet to continue.</p>
          <ConnectKitButton />
        </div>
      )}

      {isConnected && address && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Connected</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                {status}
              </span>
            </div>
            <p className="font-mono text-sm break-all">{shortenAddress(address, 6)}</p>
            <p className="text-xs text-slate-500">
              Full: <span className="font-mono">{address}</span>
            </p>
          </div>

          <NetworkSwitcher />

          {!isSupportedChain(chainId) && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              You are on {getChainLabel(chainId)}. Switch to Arc Mainnet or Arc Testnet to use AgentPay.
            </div>
          )}

          <button
            type="button"
            onClick={() => disconnect()}
            className="w-full px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
