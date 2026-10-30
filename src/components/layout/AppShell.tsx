import { type ReactNode, useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { shortenAddress } from '@/lib/wallet'
import { getChainLabel, isArcChain } from '@/lib/agentpay-config'

type NavItem = {
  id: string
  label: string
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'agents', label: 'Agents' },
  { id: 'leases', label: 'Leases' },
  { id: 'activity', label: 'Activity' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'settings', label: 'Settings' },
]

export function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: string
  onNavigate: (id: string) => void
  children: ReactNode
}) {
  const { address, isConnected, chainId } = useAccount()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-56 bg-white border-r border-slate-200 transform transition-transform lg:relative lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 flex items-center px-4 border-b border-slate-200 font-semibold tracking-tight">
          AgentPay
        </div>
        <nav className="p-2 space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                active === item.id
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {open && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 gap-3">
          <button
            type="button"
            className="lg:hidden p-1.5 rounded hover:bg-slate-100"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-sm">
            {isConnected && (
              <span className={`hidden sm:inline px-2 py-0.5 rounded text-xs ${isArcChain(chainId) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {getChainLabel(chainId)}
              </span>
            )}
            {isConnected && address ? (
              <span className="font-mono text-xs text-slate-600">{shortenAddress(address)}</span>
            ) : null}
            <ConnectKitButton />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
