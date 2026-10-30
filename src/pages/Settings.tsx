import { ARC_MAINNET, ARC_TESTNET, USDC_ADDRESS, USDC_DECIMALS } from '@/lib/agentpay-config'

export function Settings() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3 text-sm">
        <h2 className="font-medium">Supported networks</h2>
        <ul className="space-y-1 text-slate-600">
          <li>Arc Mainnet — chain ID {ARC_MAINNET.id}</li>
          <li>Arc Testnet — chain ID {ARC_TESTNET.id}</li>
        </ul>
        <p className="text-xs text-slate-400">Ethereum is not a supported AgentPay network.</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-2 text-sm">
        <h2 className="font-medium">USDC</h2>
        <p className="font-mono text-xs break-all">{USDC_ADDRESS}</p>
        <p className="text-slate-500">Decimals: {USDC_DECIMALS}</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
        No AgentPay contract address is configured. Do not assume a deployment.
      </section>
    </div>
  )
}
