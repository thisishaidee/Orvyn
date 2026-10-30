import { useAccount } from 'wagmi'
import { isSupportedChain } from '@/config'

export function Leases() {
  const { isConnected, chainId } = useAccount()

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Leases</h1>
      <p className="text-slate-600 text-sm">
        Create and manage USDC spending leases. Each lease has a spending cap, expiry, and optional recipient allowlist.
      </p>

      {!isConnected && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Connect a wallet on Arc Mainnet or Arc Testnet to manage leases.
        </div>
      )}

      {isConnected && !isSupportedChain(chainId) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Switch to Arc Mainnet or Arc Testnet in the Wallet section before creating a lease.
        </div>
      )}

      {isConnected && isSupportedChain(chainId) && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No leases. Contract interactions require a configured AgentPay address.
        </div>
      )}
    </div>
  )
}
