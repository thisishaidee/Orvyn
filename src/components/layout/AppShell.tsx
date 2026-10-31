import { useState, type ReactNode } from 'react'
import { Menu, ShieldCheck, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Drawer } from '@/components/ui/Modal'
import { BRAND } from '@/lib/brand'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

export function BrandMark({ showName = true, className }: { showName?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-brand-gradient ring-1 ring-white/15" aria-hidden>
        <ShieldCheck className="size-5 text-white" />
      </span>
      {showName && <span className="text-section tracking-tight">{BRAND.name}</span>}
    </div>
  )
}

interface SidebarContentProps {
  nav: NavItem[]
  activeId: string
  onNavigate: (id: string) => void
  footer?: ReactNode
  /** `rail`: labels collapse to icons on tablet. `full`: labels always visible (mobile drawer). */
  labels: 'rail' | 'full'
}

function SidebarContent({ nav, activeId, onNavigate, footer, labels }: SidebarContentProps) {
  const rail = labels === 'rail'
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center px-5', rail && 'md:justify-center md:px-0 lg:justify-start lg:px-5')}>
        <BrandMark showName={!rail} className="text-white" />
        {rail && <span className="ml-3 hidden text-section tracking-tight text-white lg:block">{BRAND.name}</span>}
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {nav.map(({ id, label, icon: Icon }) => {
            const active = id === activeId
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={active ? 'page' : undefined}
                  title={label}
                  className={cn(
                    'focus-ring-dark relative flex h-11 w-full items-center gap-3 rounded-control px-3 text-label transition-colors',
                    rail && 'md:justify-center md:px-0 lg:justify-start lg:px-3',
                    active ? 'bg-white/10 text-white' : 'text-brand-pale hover:bg-white/5 hover:text-white',
                  )}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-pale" aria-hidden />}
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className={cn(rail && 'md:sr-only lg:not-sr-only')}>{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      {footer && <div className={cn('shrink-0 border-t border-white/10 p-3', rail && 'md:hidden lg:block')}>{footer}</div>}
    </div>
  )
}

export interface AppShellProps {
  nav: NavItem[]
  activeId: string
  onNavigate: (id: string) => void
  /** Slot for the wallet control. The shell never touches wallet state. */
  sidebarFooter?: ReactNode
  /** Slot at the top right of the content area (and in the mobile top bar). */
  topBarActions?: ReactNode | ((tone: 'dark' | 'light') => ReactNode)
  children: ReactNode
}

/**
 * Mobile: top bar + slide-in drawer. Tablet: 72px icon rail. Laptop: 256px sidebar. Desktop (1440+): 288px sidebar
 * and a wider content column.
 */
export function AppShell({ nav, activeId, onNavigate, sidebarFooter, topBarActions, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Mobile top bar is navy, so actions there render in their `dark` tone.
  const actions = (tone: 'dark' | 'light') => (typeof topBarActions === 'function' ? topBarActions(tone) : topBarActions)

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-brand-navy px-4 py-2 text-label text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* Tablet and up: persistent sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--ap-sidebar-rail)] bg-brand-navy bg-navy-gradient text-white md:block lg:w-[var(--ap-sidebar-wide)] xl:w-[var(--ap-sidebar-wider)]">
        <SidebarContent nav={nav} activeId={activeId} onNavigate={onNavigate} footer={sidebarFooter} labels="rail" />
      </aside>

      {/* Mobile: top bar + drawer */}
      <div className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-white/10 bg-brand-navy bg-navy-gradient px-2 text-white md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="focus-ring-dark flex size-11 shrink-0 items-center justify-center rounded-control text-white hover:bg-white/10"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <BrandMark className="min-w-0 flex-1 text-white" />
        {topBarActions && <div className="shrink-0 pr-1">{actions('dark')}</div>}
      </div>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} label="Navigation">
        <SidebarContent
          nav={nav}
          activeId={activeId}
          onNavigate={(id) => {
            onNavigate(id)
            setDrawerOpen(false)
          }}
          footer={sidebarFooter}
          labels="full"
        />
      </Drawer>

      <div className="md:pl-[var(--ap-sidebar-rail)] lg:pl-[var(--ap-sidebar-wide)] xl:pl-[var(--ap-sidebar-wider)]">
        <main id="main" className="page-wash min-h-dvh bg-canvas">
          <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-6 sm:px-6 md:px-8 md:pt-8 xl:max-w-[1360px] xl:px-10">
            {topBarActions && <div className="mb-6 hidden justify-end md:flex">{actions('light')}</div>}
            {children}
            <footer className="mt-10 border-t border-line px-4 py-6 text-support text-ink-soft sm:px-6 md:px-8">
              <p>{BRAND.name} — {BRAND.tagline}</p>
              <p className="mt-1">
                Runs on Arc. USDC spending limits enforced by smart contract.
                <a className="ml-2 underline hover:text-ink" href={BRAND.repoUrl} target="_blank" rel="noreferrer">Source</a>
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
