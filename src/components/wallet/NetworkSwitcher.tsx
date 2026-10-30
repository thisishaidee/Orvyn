import { useSwitchChain, useChainId, useAccount } from 'wagmi'
import { arc, arcTestnet } from 'viem/chains'
import { Button } from '@/components/ui'
import { isSupportedChain } from '@/config'
import { useNetworkInfo } from '@/lib/wallet'

/**
 * User-initiated network switch between Arc Mainnet and Arc Testnet.
 * Does not switch silently. Surfaces pending, rejection, and failure states.
 */
export function NetworkSwitcher() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const network = useNetworkInfo()
  const { switchChain, isPending, error, reset } = useSwitchChain()

  if (!isConnected) return null

  const handleSwitch = (targetId: number) => {
    if (targetId === chainId) return
    reset()
    switchChain({ chainId: targetId })
  }

  const errorMessage = error
    ? /reject|denied|user rejected/i.test(error.message)
      ? 'Network switch was rejected by the wallet.'
      : `Switch failed: ${error.message}`
    : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-support">
        <span className="text-ink-soft">Switch network</span>
        {!isSupportedChain(chainId) && (
          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">Unsupported</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={chainId === arc.id ? 'primary' : 'secondary'}
          disabled={isPending || chainId === arc.id}
          onClick={() => handleSwitch(arc.id)}
        >
          Arc Mainnet
        </Button>
        <Button
          size="sm"
          variant={chainId === arcTestnet.id ? 'primary' : 'secondary'}
          disabled={isPending || chainId === arcTestnet.id}
          onClick={() => handleSwitch(arcTestnet.id)}
        >
          Arc Testnet
        </Button>
      </div>
      {isPending && <p className="text-support text-ink-soft">Switching network… confirm in your wallet.</p>}
      {errorMessage && <p className="text-support text-danger">{errorMessage}</p>}
      {!isSupportedChain(chainId) && (
        <p className="text-support text-warning">
          You are on {network.label}. Switch to Arc Mainnet or Arc Testnet to use AgentPay.
        </p>
      )}
    </div>
  )
}
