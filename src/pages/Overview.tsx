import { useAccount } from 'wagmi'
import { isSupportedChain } from '@/config'
import { getChainLabel } from '@/lib/agentpay-config'

export function Overview() {
  const { isConnected, chainId } = useAccount()
  const onArc = isSupportedChain(chainId)

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-slate-600 mt-1">
          USDC spending leases for AI agents on Arc.
        </p>
      </div>

      {!isConnected && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Connect an external wallet to view your leases and activity.
        </div>
      )}

      {isConnected && !onArc && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          You are on {getChainLabel(chainId)}. Switch to Arc Mainnet or Arc Testnet in the Wallet section to use AgentPay.
        </div>
      )}

      {isConnected && onArc && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Active leases" value="—" hint="No contract address configured" />
          <StatCard label="Total spent" value="—" hint="USDC · 6 decimals" />
          <StatCard label="Agents" value="—" hint="Connect and fund a lease" />
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
        AgentPay lets an owner create a capped, expiring USDC spending lease for an AI agent.
        No AgentPay contract address is configured in this build, so on-chain data is not shown.
      </div>
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{hint}</p>
    </div>
  )
}
