import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useDisconnect } from 'wagmi'
import { NetworkSwitcher } from './NetworkSwitcher'
import { shortenAddress } from '@/lib/wallet'
import { isSupportedChain } from '@/config'
import { getChainLabel } from '@/lib/agentpay-config'

/**
 * Connected-wallet modal with network switching controls.
 * Opens from the wallet page or can be triggered programmatically.
 */
export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Wallet</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>

        {!isConnected && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Connect an external wallet.</p>
            <ConnectKitButton />
          </div>
        )}

        {isConnected && address && (
          <>
            <div className="text-sm">
              <p className="text-slate-500">Address</p>
              <p className="font-mono">{shortenAddress(address, 6)}</p>
            </div>

            <NetworkSwitcher />

            {!isSupportedChain(chainId) && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                Current network ({getChainLabel(chainId)}) is not supported. Switch to Arc Mainnet or Testnet.
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                disconnect()
                onClose()
              }}
              className="w-full mt-2 px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Hook-friendly trigger button that opens the wallet modal */
export function WalletModalTrigger() {
  const [open, setOpen] = useState(false)
  const { isConnected, address } = useAccount()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50"
      >
        {isConnected && address ? shortenAddress(address) : 'Connect wallet'}
      </button>
      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
