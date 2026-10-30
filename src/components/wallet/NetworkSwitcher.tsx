import { useSwitchChain, useChainId, useAccount } from 'wagmi'
import { arc, arcTestnet } from 'viem/chains'
import { isSupportedChain } from '@/config'
import { getChainLabel } from '@/lib/agentpay-config'

export function NetworkSwitcher() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending, error, reset } = useSwitchChain()

  if (!isConnected) return null

  const currentSupported = isSupportedChain(chainId)

  const handleSwitch = (targetId: number) => {
    if (targetId === chainId) return
    reset()
    switchChain({ chainId: targetId })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Network:</span>
        <span className={currentSupported ? 'text-emerald-600' : 'text-amber-600'}>
          {getChainLabel(chainId)}
        </span>
        {!currentSupported && (
          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            Unsupported
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || chainId === arc.id}
          onClick={() => handleSwitch(arc.id)}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Arc Mainnet
        </button>
        <button
          type="button"
          disabled={isPending || chainId === arcTestnet.id}
          onClick={() => handleSwitch(arcTestnet.id)}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Arc Testnet
        </button>
      </div>

      {isPending && (
        <p className="text-sm text-slate-500">Switching network… confirm in your wallet.</p>
      )}

      {error && (
        <p className="text-sm text-red-600">
          {error.message.includes('rejected') || error.message.includes('denied')
            ? 'Network switch was rejected by the wallet.'
            : `Switch failed: ${error.message}`}
        </p>
      )}
    </div>
  )
}
