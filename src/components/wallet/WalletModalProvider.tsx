import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { WalletModal } from '@/components/wallet/WalletModal'

interface WalletModalApi {
  open: () => void
  close: () => void
}

const WalletModalContext = createContext<WalletModalApi | null>(null)

/**
 * One connect window for the whole app. The header button and the Wallet page both open this same
 * window, and both read connection state from wagmi, so they can never disagree.
 */
export function WalletModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const api = useMemo(() => ({ open, close }), [open, close])

  return (
    <WalletModalContext.Provider value={api}>
      {children}
      <WalletModal open={isOpen} onClose={close} />
    </WalletModalContext.Provider>
  )
}

export function useWalletModal(): WalletModalApi {
  const api = useContext(WalletModalContext)
  if (!api) throw new Error('useWalletModal must be used inside WalletModalProvider')
  return api
}
