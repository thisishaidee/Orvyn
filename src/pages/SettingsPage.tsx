import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { useAccount, useChains } from 'wagmi'
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui'
import { InfoList, InfoRow } from '@/components/agentpay/Notices'
import { BRAND } from '@/lib/brand'
import { walletConnectEnabled } from '@/config'
import { shortAddress } from '@/lib/agentpay'
import { useNetworkInfo } from '@/lib/wallet'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} className="mb-2" />
      {children}
    </Card>
  )
}

function Fact({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-3">
      <span
        className={ok ? 'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success' : 'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-mist text-ink-soft'}
        aria-hidden
      >
        {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      </span>
      <span className="min-w-0 text-body text-ink">
        <span className="sr-only">{ok ? 'True: ' : 'Not yet: '}</span>
        {children}
      </span>
    </li>
  )
}

export function SettingsPage() {
  const { address, isConnected, connector } = useAccount()
  const network = useNetworkInfo()
  const chains = useChains()

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader eyebrow="Settings" title="Settings" description="Your wallet, network and how the app works. Nothing here changes your funds." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Connected wallet">
          <InfoList>
            <InfoRow label="Status">
              <Badge tone={isConnected ? 'success' : 'neutral'}>{isConnected ? 'Connected' : 'Not connected'}</Badge>
            </InfoRow>
            <InfoRow label="Wallet app">{isConnected ? connector?.name ?? 'Unknown wallet' : 'None'}</InfoRow>
            <InfoRow label="Address">
              {address ? <span className="num font-mono text-support" title={address}>{shortAddress(address)}</span> : <span className="text-ink-mute">Not available</span>}
            </InfoRow>
          </InfoList>
        </Section>

        <Section title="Selected network">
          <InfoList>
            <InfoRow label="Wallet network" hint={network.chainId !== undefined ? `Chain ID ${network.chainId}` : undefined}>
              {network.label}
            </InfoRow>
            <InfoRow label="Supported by this app">
              {isConnected ? <Badge tone={network.supported ? 'success' : 'warning'}>{network.supported ? 'Yes' : 'No'}</Badge> : <span className="text-ink-mute">Not applicable</span>}
            </InfoRow>
            <InfoRow label="Networks this app can use" hint="Arc Mainnet and Arc Testnet only.">
              {chains.map((c) => `${c.name} (${c.id})`).join(', ')}
            </InfoRow>
          </InfoList>
        </Section>

        <Section title="Application preferences" description="No adjustable preferences exist yet.">
          <InfoList>
            <InfoRow label="Theme">Light</InfoRow>
            <InfoRow label="Currency display">USDC, 6 decimal places</InfoRow>
            <InfoRow label="Language">English</InfoRow>
          </InfoList>
        </Section>

        <Section title="Security information">
          <ul className="divide-y divide-line">
            <Fact ok>This app never asks for your private key or recovery phrase. Your wallet signs every action.</Fact>
            <Fact ok>Spending rules are enforced by the AgentPay contract, not by this website.</Fact>
            <Fact ok>The contract has no administrator, pause switch or upgrade path. Each lease is controlled by the wallet that created it.</Fact>
            <Fact ok={false}>An independent security audit of the contract has not been completed.</Fact>
            <Fact ok={false}>This app is not connected to the contract yet, so it cannot create, revoke or spend from a lease.</Fact>
          </ul>
        </Section>
      </div>

      <Section title={`About ${BRAND.name}`}>
        <InfoList>
          <InfoRow label="Product">{BRAND.name}</InfoRow>
          <InfoRow label="Purpose">{BRAND.tagline}</InfoRow>
          <InfoRow label="Stage">Prototype. The product name is temporary.</InfoRow>
          <InfoRow label="Contract">Not connected. No contract address is configured in this app.</InfoRow>
          <InfoRow label="Wallet connections">
            Browser wallets, Coinbase Wallet{walletConnectEnabled ? ', WalletConnect' : ' (WalletConnect not configured)'}
          </InfoRow>
          <InfoRow label="Source code">
            <a href={BRAND.repoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-blue underline-offset-2 hover:underline">
              GitHub repository
            </a>
          </InfoRow>
          <InfoRow label="Built with">
            <a href="https://studio.arc.io" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-blue underline-offset-2 hover:underline">
              Arc Studio
            </a>
          </InfoRow>
        </InfoList>
      </Section>
    </div>
  )
}
