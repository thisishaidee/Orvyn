import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight, Copy, Loader2, QrCode as QrIcon, Smartphone, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Badge, Button, Modal, Notice } from '@/components/ui'
import { QrCode } from '@/components/wallet/QrCode'
import { useNetworkInfo } from '@/lib/wallet'
import { NetworkSwitcher } from '@/components/wallet/NetworkSwitcher'
import { WALLETCONNECT_ENV_VAR, describeConnectError, useWalletOptions, type WalletOption } from '@/lib/wallets'
import { shortAddress } from '@/lib/agentpay'

interface WcProvider {
  on: (event: 'display_uri', listener: (uri: string) => void) => void
  removeListener: (event: 'display_uri', listener: (uri: string) => void) => void
}

function WalletIcon({ option, fallback }: { option?: Pick<WalletOption, 'icon' | 'name'>; fallback?: ReactNode }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-control bg-brand-mist text-brand-blue" aria-hidden>
      {option?.icon ? <img src={option.icon} alt="" className="size-8 object-contain" /> : (fallback ?? <Wallet className="size-5" />)}
    </span>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-label text-ink">{title}</h3>
        {description && <p className="text-support text-ink-soft">{description}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

interface RowProps {
  icon: ReactNode
  title: string
  subtitle: ReactNode
  onClick?: () => void
  pending?: boolean
  disabled?: boolean
  badge?: ReactNode
}

function WalletRow({ icon, title, subtitle, onClick, pending, disabled, badge }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className="focus-ring flex min-h-14 w-full items-center gap-3 rounded-card border border-line bg-surface p-2.5 text-left transition-colors hover:bg-brand-mist disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-surface"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-ink">{title}</span>
        <span className="block text-support text-ink-soft">{subtitle}</span>
      </span>
      {badge}
      {pending ? <Loader2 className="size-5 shrink-0 animate-spin text-brand-blue" aria-label="Waiting for wallet" /> : onClick && <ChevronRight className="size-5 shrink-0 text-ink-mute" aria-hidden />}
    </button>
  )
}

export interface WalletModalProps {
  open: boolean
  onClose: () => void
}

/** The window is mounted only while open, so every visit starts from a clean state. */
export function WalletModal({ open, onClose }: WalletModalProps) {
  return open ? <WalletModalContent onClose={onClose} /> : null
}

function WalletModalContent({ onClose }: { onClose: () => void }) {
  const { address, isConnected, connector: active } = useAccount()
  const { connectAsync, reset } = useConnect()
  const { disconnect } = useDisconnect()
  const options = useWalletOptions()
  const network = useNetworkInfo()
  const [pendingUid, setPendingUid] = useState<string>()
  const [error, setError] = useState<string>()
  const [view, setView] = useState<'list' | 'walletconnect'>('list')
  const [wcUri, setWcUri] = useState<string>()
  const attempt = useRef(0) // lets the user stop waiting without leaving a stale result behind
  const cleanup = useRef<() => void>(() => {})

  // Clear any half-finished connection attempt when the window closes.
  useEffect(() => () => { cleanup.current(); reset() }, [reset])

  const connectWith = async (option: WalletOption) => {
    const id = ++attempt.current
    setError(undefined)
    setPendingUid(option.connector.uid)
    cleanup.current()
    let detach = () => {}
    try {
      if (option.kind === 'walletconnect') {
        setView('walletconnect')
        setWcUri(undefined)
        const provider = (await option.connector.getProvider()) as WcProvider
        let sawUri = false
        const fail = (message: string) => {
          if (attempt.current !== id) return
          attempt.current += 1
          setPendingUid(undefined)
          setError(message)
        }
        const onUri = (uri: string) => {
          sawUri = true
          setWcUri(uri)
        }
        // WalletConnect can fail without rejecting our promise (for example when its network is unreachable),
        // so also watch for its stray rejection and for a session that never starts.
        const onRejection = (ev: PromiseRejectionEvent) => {
          const message = String((ev.reason as Error | undefined)?.message ?? ev.reason)
          if (/subscribe|relay|websocket|interrupted/i.test(message)) {
            ev.preventDefault()
            fail(describeConnectError(ev.reason))
          }
        }
        const timer = window.setTimeout(() => {
          if (!sawUri) fail(describeConnectError(new Error('timeout waiting for relay')))
        }, 20000)
        provider.on('display_uri', onUri)
        window.addEventListener('unhandledrejection', onRejection)
        detach = () => {
          window.clearTimeout(timer)
          window.removeEventListener('unhandledrejection', onRejection)
          provider.removeListener('display_uri', onUri)
        }
        cleanup.current = detach
      }
      await connectAsync({ connector: option.connector })
      if (attempt.current === id) onClose()
    } catch (e) {
      if (attempt.current === id) setError(describeConnectError(e))
    } finally {
      detach()
      if (attempt.current === id) setPendingUid(undefined)
    }
  }

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(done)
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.')
    }
  }

  const stopWaiting = () => {
    attempt.current += 1
    cleanup.current()
    setPendingUid(undefined)
    setView('list')
    reset()
  }

  const busy = pendingUid !== undefined
  const wcPending = options.walletConnect && pendingUid === options.walletConnect.connector.uid

  let body: ReactNode
  if (isConnected && address) {
    body = (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-card bg-brand-mist p-3">
          <WalletIcon option={{ icon: active?.icon, name: active?.name ?? '' }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium text-ink">{active?.name ?? 'Connected wallet'}</p>
            <p className="num font-mono text-support text-ink-soft">{shortAddress(address)}</p>
          </div>
          <Badge tone="success">Connected</Badge>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-support">
          <span className="text-ink-soft">Network</span>
          <span className="flex items-center gap-2 text-ink">
            {network.label}
            <Badge tone={network.supported ? 'success' : 'warning'}>{network.supported ? 'Supported' : 'Not supported'}</Badge>
          </span>
        </div>
        <NetworkSwitcher />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="w-full sm:w-auto sm:flex-1" onClick={() => void copy(address, 'Address copied')} iconLeft={<Copy className="size-4" aria-hidden />}>
            Copy address
          </Button>
          <Button variant="destructive" className="w-full sm:w-auto sm:flex-1" onClick={() => { setError(undefined); setPendingUid(undefined); disconnect() }}>
            Disconnect
          </Button>
        </div>
      </div>
    )
  } else if (view === 'walletconnect') {
    body = (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { stopWaiting(); setError(undefined) }} iconLeft={<ArrowLeft className="size-4" aria-hidden />}>
          Back
        </Button>
        {error ? (
          <Notice tone="danger" title="Could not connect">{error}</Notice>
        ) : (
          <p className="text-center text-support text-ink-soft">
            {wcUri ? 'Scan with your wallet app, or open it directly on this phone.' : 'Preparing a secure connection…'}
          </p>
        )}
        {!error && <QrCode value={wcUri} label="WalletConnect QR code. Scan it with a mobile wallet." />}
        {!error && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={wcUri}
              aria-disabled={!wcUri}
              className={`focus-ring inline-flex h-11 w-full items-center justify-center sm:w-auto sm:flex-1 gap-2 rounded-control bg-brand-navy px-4 text-body font-medium text-white hover:bg-brand-blue ${wcUri ? '' : 'pointer-events-none opacity-50'}`}
            >
              <Smartphone className="size-4" aria-hidden /> Open wallet app
            </a>
            <Button variant="secondary" className="w-full sm:w-auto sm:flex-1" disabled={!wcUri} onClick={() => wcUri && void copy(wcUri, 'Link copied')} iconLeft={<Copy className="size-4" aria-hidden />}>
              Copy link
            </Button>
          </div>
        )}
        {error && options.walletConnect && (
          <Button fullWidth onClick={() => options.walletConnect && void connectWith(options.walletConnect)} loading={Boolean(wcPending)}>
            Try again
          </Button>
        )}
        <p className="text-center text-support text-ink-mute">Approve the request in your wallet. AgentPay never asks for a recovery phrase or private key.</p>
      </div>
    )
  } else {
    body = (
      <div className="space-y-6">
        {error && <Notice tone="danger" title="Could not connect">{error}</Notice>}
        {busy && !wcPending && (
          <Notice tone="info">
            Check your wallet and approve the connection request.
            <Button size="sm" variant="secondary" onClick={stopWaiting} className="mt-2">Stop waiting</Button>
          </Notice>
        )}

        <Section title="Detected browser wallets" description="Wallets installed in this browser, or the wallet app you opened this page in.">
          {options.detected.map((o) => (
            <WalletRow key={o.connector.uid} icon={<WalletIcon option={o} />} title={o.name} subtitle="Detected in this browser" pending={pendingUid === o.connector.uid} disabled={busy} onClick={() => void connectWith(o)} />
          ))}
          {options.generic && (
            <WalletRow icon={<WalletIcon option={options.generic} />} title="Browser wallet" subtitle="An unnamed wallet was found in this browser" pending={pendingUid === options.generic.connector.uid} disabled={busy} onClick={() => options.generic && void connectWith(options.generic)} />
          )}
          {options.detected.length === 0 && !options.generic && (
            <p className="rounded-card border border-dashed border-line-strong bg-canvas p-3 text-support text-ink-soft">
              No browser wallet was detected. On a phone, open this page inside your wallet app&apos;s browser, or connect with a mobile wallet below.
            </p>
          )}
          {options.detected.length > 1 && <p className="text-support text-ink-soft">Several wallets were detected. Only the one you choose is connected.</p>}
        </Section>

        <Section title="Connect with a mobile wallet" description="Scan a QR code or open your wallet app. Works with MetaMask, OKX Wallet, Trust Wallet, Zerion and other WalletConnect wallets.">
          {options.walletConnect ? (
            <WalletRow icon={<WalletIcon fallback={<QrIcon className="size-5" />} />} title="WalletConnect" subtitle="QR code or mobile app" pending={Boolean(wcPending)} disabled={busy} onClick={() => options.walletConnect && void connectWith(options.walletConnect)} />
          ) : (
            <WalletRow icon={<WalletIcon fallback={<QrIcon className="size-5" />} />} title="WalletConnect" subtitle={<>Not enabled in this build. Needs <code className="font-mono text-ink">{WALLETCONNECT_ENV_VAR}</code>.</>} disabled badge={<Badge tone="warning">Setup needed</Badge>} />
          )}
        </Section>

        {options.coinbase && (
          <Section title="Other wallet options">
            <WalletRow icon={<WalletIcon option={options.coinbase} />} title="Coinbase Wallet" subtitle="Browser extension or mobile app" pending={pendingUid === options.coinbase.connector.uid} disabled={busy} onClick={() => options.coinbase && void connectWith(options.coinbase)} />
          </Section>
        )}

        <p className="text-support text-ink-mute">Connecting only shares your public address. It never sends a transaction or asks for a recovery phrase or private key.</p>
      </div>
    )
  }

  return (
    <Modal open onClose={onClose} title={isConnected ? 'Your wallet' : 'Connect a wallet'} description={isConnected ? undefined : 'Choose how you want to connect.'}>
      {body}
    </Modal>
  )
}
