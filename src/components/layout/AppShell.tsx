import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BRAND } from '@/lib/brand'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

function OrvynnMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M30.5 30.5V6.5A24 24 0 0 0 6.5 30.5Z" />
    <path d="M37.5 26.5H61.5A24 24 0 0 0 37.5 2.5Z" />
    <path d="M33.5 33.5V57.5A24 24 0 0 0 57.5 33.5Z" />
    <path d="M30.5 33.5H6.5A24 24 0 0 0 30.5 57.5Z" />
  </svg>
}

export function BrandMark({ showName = true, className }: { showName?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-white text-brand-navy ring-1 ring-white/15" aria-hidden>
        <OrvynnMark className="size-7" />
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
}

function SidebarContent({ nav, activeId, onNavigate, footer }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <BrandMark className="text-white" />
      </div>
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {nav.map(({ id, label, icon: Icon }) => {
            const active = id === activeId
            return (
              <li key={id}>
                <button type="button" onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} title={label}
                  className={cn('focus-ring-dark relative flex h-11 w-full items-center gap-3 rounded-control px-3 text-label transition-colors', active ? 'bg-white/10 text-white' : 'text-brand-pale hover:bg-white/5 hover:text-white')}>
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-pale" aria-hidden />}
                  <Icon className="size-5 shrink-0" aria-hidden /><span>{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      {footer && <div className="shrink-0 border-t border-white/10 p-3">{footer}</div>}
    </div>
  )
}

export interface AppShellProps {
  nav: NavItem[]
  activeId: string
  onNavigate: (id: string) => void
  sidebarFooter?: ReactNode
  topBarActions?: ReactNode | ((tone: 'dark' | 'light') => ReactNode)
  children: ReactNode
}

export function AppShell({ nav, activeId, onNavigate, sidebarFooter, topBarActions, children }: AppShellProps) {
  const actions = (tone: 'dark' | 'light') => (typeof topBarActions === 'function' ? topBarActions(tone) : topBarActions)

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-control bg-brand-navy px-4 py-2 text-label text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--ap-sidebar-rail)] bg-brand-navy bg-navy-gradient text-white md:block lg:w-[var(--ap-sidebar-wide)] xl:w-[var(--ap-sidebar-wider)]">
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-center px-2 lg:justify-start lg:px-5">
            <BrandMark showName={false} className="text-white lg:hidden" /><BrandMark className="hidden text-white lg:flex" />
          </div>
          <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-2 lg:px-3">
            <ul className="space-y-1">
              {nav.map(({ id, label, icon: Icon }) => {
                const active = id === activeId
                return <li key={id}><button type="button" onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} aria-label={label} title={label}
                  className={cn('focus-ring-dark relative flex h-11 w-full items-center justify-center gap-3 rounded-control px-2 text-label transition-colors lg:justify-start lg:px-3', active ? 'bg-white/10 text-white' : 'text-brand-pale hover:bg-white/5 hover:text-white')}>
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-pale" aria-hidden />}<Icon className="size-5 shrink-0" aria-hidden /><span className="hidden lg:inline">{label}</span>
                </button></li>
              })}
            </ul>
          </nav>
          {sidebarFooter && <div className="hidden shrink-0 border-t border-white/10 p-3 lg:block">{sidebarFooter}</div>}
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-brand-navy bg-navy-gradient px-4 text-white md:hidden">
        <BrandMark className="min-w-0 text-white" />{topBarActions && <div className="shrink-0">{actions('dark')}</div>}
      </header>
      <div className="md:pl-[var(--ap-sidebar-rail)] lg:pl-[var(--ap-sidebar-wide)] xl:pl-[var(--ap-sidebar-wider)]">
        <main id="main" className="page-wash min-h-dvh bg-canvas">
          <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 pt-6 pl-[calc(1rem+4.25rem)] sm:px-6 sm:pl-[calc(1.5rem+4.25rem)] md:px-8 md:pb-24 md:pl-8 md:pt-8 xl:max-w-[1360px] xl:px-10">
            {topBarActions && <div className="mb-6 hidden justify-end md:flex">{actions('light')}</div>}
            {children}
            <footer className="mt-10 border-t border-line px-1 py-6 text-support text-ink-soft sm:px-2"><p>{BRAND.name} — {BRAND.tagline}</p><p className="mt-1">Built for Arc. USDC spending limits enforced by smart contract.<a className="ml-2 underline hover:text-ink" href={BRAND.repoUrl} target="_blank" rel="noreferrer">Source</a></p></footer>
          </div>
        </main>
      </div>
      <nav aria-label="Primary navigation" className="fixed inset-y-14 left-0 z-40 w-[4.25rem] border-r border-[#DCE6F2] bg-white/95 shadow-[8px_0_24px_rgba(23,41,75,0.06)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex h-full flex-col items-stretch gap-1 overflow-y-auto px-1.5 py-3">
          {nav.map(({ id, label, icon: Icon }) => {
            const active = id === activeId
            return (
              <li key={id} className="min-w-0">
                <button type="button" onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} aria-label={label} title={label}
                  className={cn('relative flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold leading-tight transition-colors active:scale-[.97]', active ? 'bg-[#EAF2FC] text-brand-navy' : 'text-ink-mute hover:bg-[#F5F8FC] hover:text-brand-navy')}>
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-blue" aria-hidden />}
                  <Icon className={cn('size-5 shrink-0 transition-transform', active && 'scale-105 stroke-[2.4] text-brand-blue')} aria-hidden />
                  <span className="max-w-full text-center">{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
