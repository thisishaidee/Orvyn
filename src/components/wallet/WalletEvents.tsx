import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAccount, useAccountEffect } from 'wagmi'
import { shortAddress } from '@/lib/agentpay'
import { useNetworkInfo } from '@/lib/wallet'

/**
 * Reports wallet changes the user did not make in this app: switching account or network inside the wallet,
 * and connecting or disconnecting. It renders nothing. wagmi already updates every screen; this only explains why.
 */
export function WalletEvents() {
  const { address, isConnected } = useAccount()
  const network = useNetworkInfo()
  const last = useRef<{ address?: string; chainId?: number }>({})

  useAccountEffect({
    onConnect({ connector, isReconnected }) {
      if (!isReconnected) toast.success(`Connected with ${connector.name}`)
    },
    onDisconnect() {
      last.current = {}
      toast('Wallet disconnected')
    },
  })

  useEffect(() => {
    if (!isConnected || !address) return
    const previous = last.current
    if (previous.address && previous.address !== address) toast(`Account changed to ${shortAddress(address)}`)
    if (previous.chainId !== undefined && network.chainId !== undefined && previous.chainId !== network.chainId) {
      toast(`Network changed to ${network.label}`)
    }
    last.current = { address, chainId: network.chainId }
  }, [address, isConnected, network.chainId, network.label])

  return null
}
