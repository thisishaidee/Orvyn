import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Overview } from './pages/Overview'
import { Agents } from './pages/Agents'
import { Leases } from './pages/Leases'
import { Activity } from './pages/Activity'
import { WalletPage } from './pages/WalletPage'
import { Settings } from './pages/Settings'

type PageId = 'overview' | 'agents' | 'leases' | 'activity' | 'wallet' | 'settings'

export default function App() {
  const [page, setPage] = useState<PageId>('overview')

  return (
    <AppShell active={page} onNavigate={(id) => setPage(id as PageId)}>
      {page === 'overview' && <Overview />}
      {page === 'agents' && <Agents />}
      {page === 'leases' && <Leases />}
      {page === 'activity' && <Activity />}
      {page === 'wallet' && <WalletPage />}
      {page === 'settings' && <Settings />}
    </AppShell>
  )
}
