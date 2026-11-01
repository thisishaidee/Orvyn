import { ArrowRight, Check, Clock3, LockKeyhole, Wallet } from 'lucide-react'
import { BRAND } from '@/lib/brand'

const steps = [
  { title: 'Create a lease', text: 'Choose a delegate wallet, set a spending cap and expiry, and optionally restrict who it can pay.' },
  { title: 'Fund it with USDC', text: 'Deposit only the amount you want available to that lease. The cap and the deposited balance are separate controls.' },
  { title: 'Stay in control', text: 'Track activity, revoke future spending, and withdraw the USDC that remains in the lease.' },
]

const controls = [
  { icon: LockKeyhole, title: 'Bounded permissions', text: 'Each delegate gets its own lease with a defined spending limit and expiry.' },
  { icon: Check, title: 'Recipient restrictions', text: 'Optionally limit payments to wallet addresses you approve.' },
  { icon: Clock3, title: 'Owner control', text: 'Revoke a lease to stop future payments. Withdrawals are a separate action.' },
]

function OrvynnMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M30.5 30.5V6.5A24 24 0 0 0 6.5 30.5Z" />
    <path d="M37.5 26.5H61.5A24 24 0 0 0 37.5 2.5Z" />
    <path d="M33.5 33.5V57.5A24 24 0 0 0 57.5 33.5Z" />
    <path d="M30.5 33.5H6.5A24 24 0 0 0 30.5 57.5Z" />
  </svg>
}

export function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="min-h-dvh overflow-hidden bg-canvas text-ink">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <a href="/" className="flex items-center gap-3" aria-label={BRAND.name + ' home'}>
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-card">
            <OrvynnMark className="size-7" />
          </span>
          <span className="text-base font-semibold tracking-tight">{BRAND.name}</span>
        </a>
        <div className="flex items-center gap-3">
          <a href={BRAND.repoUrl} target="_blank" rel="noreferrer" className="hidden text-sm font-medium text-ink-soft transition hover:text-ink sm:inline-flex">Source code</a>
          <button onClick={onLaunch} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-navy px-4 text-sm font-medium text-white shadow-card transition hover:bg-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
            Open app <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <main>
        <section className="relative isolate mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute -right-32 top-0 -z-10 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(169,196,232,.35),transparent_68%)]" />
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium uppercase tracking-[.12em] text-brand-blue">
              <span className="size-1.5 rounded-full bg-brand-blue" /> Built for Arc
            </p>
            <h1 className="mt-6 max-w-2xl text-[2.25rem] font-light leading-[1.12] tracking-[-.035em] text-brand-navy sm:text-[2.85rem] sm:leading-[1.1] lg:text-[3.65rem] lg:leading-[1.08] lg:tracking-[-.04em]">
              Give agents a spending limit, not your keys.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink-soft">
              {BRAND.name} gives AI-agent delegates bounded USDC spending permissions on Arc. Set the rules, fund a lease, and keep control of what happens next.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button onClick={onLaunch} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-navy px-5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(23,41,75,.18)] transition hover:bg-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                Launch Orvynn <ArrowRight className="size-4" aria-hidden />
              </button>
              <a href="#how-it-works" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-medium text-brand-navy transition hover:bg-surface-muted">See how it works</a>
            </div>
            <p className="mt-5 text-xs leading-5 text-ink-mute">On-chain spending rules. Owner-controlled leases. USDC on Arc.</p>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2rem] bg-[linear-gradient(135deg,rgba(255,255,255,.8),rgba(169,196,232,.22),rgba(255,255,255,.35))] blur-xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_28px_80px_rgba(23,41,75,.14)] backdrop-blur sm:p-7">
              <div className="flex items-center justify-between border-b border-line pb-5">
                <div>
                  <p className="text-xs font-medium text-ink-mute">LEASE OVERVIEW</p>
                  <p className="mt-1 text-lg font-medium text-brand-navy">Delegate permissions</p>
                </div>
                <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">Active</span>
              </div>
              <div className="py-6">
                <div className="flex items-end justify-between gap-3">
                  <div><p className="text-xs text-ink-mute">Spending cap</p><p className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">10.00 <span className="text-base font-medium text-ink-soft">USDC</span></p></div>
                  <span className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink-soft">Per day</span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full w-[38%] rounded-full bg-brand-gradient" /></div>
                <div className="mt-2 flex justify-between text-xs text-ink-mute"><span>3.80 spent</span><span>6.20 remaining</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-canvas p-3"><Wallet className="size-4 text-brand-blue" /><p className="mt-3 text-xs text-ink-mute">Lease funding</p><p className="mt-1 text-sm font-medium text-brand-navy">Owner funded</p></div>
                <div className="rounded-xl border border-line bg-canvas p-3"><LockKeyhole className="size-4 text-brand-blue" /><p className="mt-3 text-xs text-ink-mute">Rule enforcement</p><p className="mt-1 text-sm font-medium text-brand-navy">On-chain</p></div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-ink-mute">Illustrative interface preview. Values shown are examples, not live account data.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-line bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-2xl"><p className="text-xs font-medium uppercase tracking-[.12em] text-brand-blue">How it works</p><h2 className="mt-3 text-[2rem] font-light leading-[1.08] tracking-[-.03em] text-brand-navy sm:text-[3rem]">A clear boundary between an agent and your funds.</h2><p className="mt-4 leading-7 text-ink-soft">Instead of handing a delegate unrestricted access to a wallet, give it a specific permission with limits enforced by the contract.</p></div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map((step) => <article key={step.number} className="rounded-2xl border border-line bg-canvas p-6 sm:p-7"><p className="text-sm font-semibold tracking-widest text-brand-blue">{step.number}</p><h3 className="mt-4 text-base font-medium text-brand-navy">{step.title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p></article>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-blue">Designed around control</p><h2 className="mt-3 text-[1.8rem] font-light leading-[1.14] tracking-[-.03em] text-brand-navy sm:text-[2.35rem] sm:leading-[1.12]">Permission without giving up ownership.</h2><p className="mt-4 max-w-md leading-7 text-ink-soft">Each lease is a separate set of spending rules. You decide the delegate, the limit, the duration and whether recipients need to be pre-approved.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {controls.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-line bg-surface p-6"><span className="flex size-10 items-center justify-center rounded-xl bg-mist text-brand-blue"><Icon className="size-5" /></span><h3 className="mt-4 text-base font-medium text-brand-navy">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p></article>)}
            </div>
          </div>
          <div className="mt-12 rounded-2xl border border-line bg-canvas p-5 text-sm leading-6 text-ink-soft sm:p-6">
            <strong className="text-brand-navy">A note on funds:</strong> Revoking a lease stops future spending; it does not automatically withdraw the remaining balance. The owner must submit a separate withdrawal transaction. Funds already spent cannot be recovered.
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-brand-navy px-6 py-12 text-white shadow-[0_24px_70px_rgba(23,41,75,.2)] sm:px-10 sm:py-16">
            <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-pale">Take control of agent spending</p><h2 className="mt-4 text-[1.8rem] font-light leading-[1.14] tracking-[-.03em] sm:text-[2.35rem] sm:leading-[1.12]">Set the rules before the first payment.</h2><p className="mt-4 leading-7 text-brand-pale">Create a lease and give your delegate only the permissions it needs.</p><button onClick={onLaunch} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-brand-navy transition hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Open Orvynn <ArrowRight className="size-4" /></button></div>
          </div>
        </section>
      </main>

      <footer className="bg-canvas">
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8 sm:pb-12 sm:pt-14 lg:px-10">
          <div className="flex flex-col gap-6 border-b border-line/70 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <a href={BRAND.repoUrl} target="_blank" rel="noreferrer" className="text-base font-normal text-brand-navy transition hover:text-brand-blue">Contact via GitHub</a>
              <p className="text-sm text-ink-soft">Questions, feedback or contributions.</p>
            </div>
            <div className="flex items-center justify-between gap-5 sm:justify-end">
              <a href={BRAND.repoUrl} target="_blank" rel="noreferrer" aria-label="Orvynn on GitHub" className="inline-flex size-10 items-center justify-center rounded-full text-brand-navy transition hover:bg-surface hover:text-brand-blue"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.31-3.76-1.31-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.61 5.24-5.1 5.51.4.35.75 1.03.75 2.08v3.07c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg></a>
              <button onClick={onLaunch} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-brand-navy shadow-card transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">Open app <ArrowRight className="size-4" aria-hidden /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-9 pt-9 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 lg:gap-16">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[.08em] text-ink-mute">Product</p>
              <nav aria-label="Product links" className="mt-5 flex flex-col items-start gap-3.5 text-[15px] leading-6 text-ink">
                <a href="#how-it-works" className="transition hover:text-brand-blue">How it works</a>
                <a href="/?page=overview" className="transition hover:text-brand-blue">Overview</a>
                <a href="/?page=leases" className="transition hover:text-brand-blue">Leases</a>
              </nav>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[.08em] text-ink-mute">Developers</p>
              <nav aria-label="Developer links" className="mt-5 flex flex-col items-start gap-3.5 text-[15px] leading-6 text-ink">
                <a href={BRAND.repoUrl} target="_blank" rel="noreferrer" className="transition hover:text-brand-blue">GitHub repository</a>
                <a href={BRAND.repoUrl + '/tree/main/contracts'} target="_blank" rel="noreferrer" className="transition hover:text-brand-blue">Smart contracts</a>
              </nav>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[.08em] text-ink-mute">Company</p>
              <nav aria-label="Company links" className="mt-5 flex flex-col items-start gap-3.5 text-[15px] leading-6 text-ink">
                <a href={BRAND.repoUrl} target="_blank" rel="noreferrer" className="transition hover:text-brand-blue">About Orvynn</a>
                <a href="https://arc.network" target="_blank" rel="noreferrer" className="transition hover:text-brand-blue">Built for Arc</a>
              </nav>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-2 text-xs leading-5 text-ink-mute sm:flex-row sm:items-center sm:justify-between">
            <p>{BRAND.name} · {BRAND.tagline}</p>
            <p>USDC spending permissions on Arc.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
