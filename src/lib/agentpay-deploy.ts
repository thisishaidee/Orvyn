// Pure deployment-safety logic for the browser deploy page, kept free of
// wagmi/viem so it stays unit-testable. The page calls these before every
// wallet action; the wallet is the only thing that can sign.

export const EXPECTED_DEPLOYER = '0xCB2A51B4D34cC6f5dd574F7b5BfA8260E4201C55'
export const ARC_MAINNET_CHAIN_ID = 5042

export type SafetyCheck =
  | { status: 'idle' | 'checking' }
  | { status: 'ok'; detail: string }
  | { status: 'fail'; detail: string }

export type DeployPhase = 'review' | 'signing' | 'pending' | 'deployed' | 'failed'

export type DeployInputs = {
  phase: DeployPhase
  account: string | undefined
  chainId: number | undefined
  deployerCheck: SafetyCheck
  usdcCheck: SafetyCheck
  gasEstimate: bigint | undefined
}

// True only when a fresh deployment may be started right now.
export function canStartDeployment(inputs: DeployInputs): boolean {
  if (inputs.phase === 'signing' || inputs.phase === 'pending' || inputs.phase === 'deployed') return false
  if (!inputs.account) return false
  if (inputs.chainId !== ARC_MAINNET_CHAIN_ID) return false
  if (!isExpectedDeployer(inputs.account)) return false
  if (inputs.deployerCheck.status !== 'ok') return false
  if (inputs.usdcCheck.status !== 'ok') return false
  if (!isSaneGasEstimate(inputs.gasEstimate)) return false
  return true
}

export function isExpectedDeployer(account: string | undefined): boolean {
  return !!account && account.toLowerCase() === EXPECTED_DEPLOYER.toLowerCase()
}

// True when a wallet/chain change must invalidate previously passed checks.
export function checksStale(inputs: DeployInputs): boolean {
  return (
    !inputs.account ||
    !isExpectedDeployer(inputs.account) ||
    inputs.chainId !== ARC_MAINNET_CHAIN_ID
  )
}

// Outcome of re-checking a submitted transaction. Only a known failure may
// re-enable deployment; an RPC failure leaves the outcome unknown because the
// transaction may still land.
export type ReceiptOutcome =
  | { kind: 'pending' }
  | { kind: 'success'; contractAddress: `0x${string}` }
  | { kind: 'reverted' }
  | { kind: 'unknown'; reason: string }

export function classifyReceiptError(err: unknown): ReceiptOutcome {
  const message = err instanceof Error ? err.message : String(err)
  if (/receipt not found|not found/i.test(message)) return { kind: 'pending' }
  return { kind: 'unknown', reason: message }
}

export function classifyReceiptStatus(status: string, contractAddress: `0x${string}` | undefined): ReceiptOutcome {
  if (status === 'success' && contractAddress) return { kind: 'success', contractAddress }
  if (status === 'success') return { kind: 'unknown', reason: 'Receipt succeeded but has no contract address.' }
  return { kind: 'reverted' }
}

// ---- Gas limit -------------------------------------------------------------
// The estimate comes from the real creation bytecode (about 1.2M gas today). A
// buffer protects against a slightly low estimate; unused gas is refunded, so
// the buffer only raises the ceiling, never the price paid.
export const GAS_BUFFER_PERCENT = 20n
// An estimate far above the expected cost means something is wrong: refuse.
export const MAX_SANE_GAS_ESTIMATE = 2_500_000n
// Hard ceiling for the buffered limit.
export const MAX_GAS_LIMIT = 3_000_000n

export function isSaneGasEstimate(estimate: bigint | undefined): boolean {
  return estimate !== undefined && estimate > 0n && estimate <= MAX_SANE_GAS_ESTIMATE
}

// Estimate plus the buffer, rounded up, never above MAX_GAS_LIMIT.
export function gasLimitWithBuffer(estimate: bigint): bigint {
  if (!isSaneGasEstimate(estimate)) {
    throw new RangeError('Gas estimate is outside the expected range; refusing to deploy.')
  }
  const buffered = (estimate * (100n + GAS_BUFFER_PERCENT) + 99n) / 100n
  return buffered > MAX_GAS_LIMIT ? MAX_GAS_LIMIT : buffered
}

// ---- Saved deployment state -----------------------------------------------
// Only public facts are persisted in the browser: the transaction hash, chain,
// the (public) deployer address, the phase and the resulting contract address.
// Never keys, phrases, signatures or any wallet data.
export const DEPLOY_STORAGE_KEY = 'agentpay.deploy.mainnet.v1'

export type SavedDeployment = {
  v: 1
  txHash: `0x${string}`
  chainId: typeof ARC_MAINNET_CHAIN_ID
  deployer: string
  phase: 'pending' | 'deployed' | 'failed'
  contractAddress?: `0x${string}`
  savedAt: number
}

const TX_HASH = /^0x[0-9a-fA-F]{64}$/
const ADDRESS = /^0x[0-9a-fA-F]{40}$/

export function serializeSavedDeployment(d: SavedDeployment): string {
  // Explicit field list: nothing else can ever be written.
  return JSON.stringify({
    v: 1,
    txHash: d.txHash,
    chainId: d.chainId,
    deployer: d.deployer,
    phase: d.phase,
    ...(d.contractAddress ? { contractAddress: d.contractAddress } : {}),
    savedAt: d.savedAt,
  })
}

// Strict parser: anything malformed, from another chain or another deployer is ignored.
export function parseSavedDeployment(raw: string | null | undefined): SavedDeployment | undefined {
  if (!raw) return undefined
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (typeof value !== 'object' || value === null) return undefined
  const o = value as Record<string, unknown>
  if (o.v !== 1 || o.chainId !== ARC_MAINNET_CHAIN_ID) return undefined
  if (typeof o.txHash !== 'string' || !TX_HASH.test(o.txHash)) return undefined
  if (typeof o.deployer !== 'string' || !isExpectedDeployer(o.deployer)) return undefined
  if (o.phase !== 'pending' && o.phase !== 'deployed' && o.phase !== 'failed') return undefined
  if (typeof o.savedAt !== 'number' || !Number.isFinite(o.savedAt)) return undefined
  let contractAddress: `0x${string}` | undefined
  if (o.contractAddress !== undefined) {
    if (typeof o.contractAddress !== 'string' || !ADDRESS.test(o.contractAddress)) return undefined
    contractAddress = o.contractAddress as `0x${string}`
  }
  if (o.phase === 'deployed' && !contractAddress) return undefined
  return {
    v: 1,
    txHash: o.txHash as `0x${string}`,
    chainId: ARC_MAINNET_CHAIN_ID,
    deployer: o.deployer,
    phase: o.phase,
    contractAddress,
    savedAt: o.savedAt,
  }
}

// ---- Navigation ------------------------------------------------------------
// The Deploy item belongs in the public navigation only until AgentPay is
// deployed: once an address is configured, or this browser has recorded a
// deployed contract, it is hidden. The page itself stays reachable at ?page=deploy.
export function isDeployNavVisible(args: { configuredAddress: string | undefined; saved: SavedDeployment | undefined }): boolean {
  if (args.configuredAddress) return false
  if (args.saved?.phase === 'deployed') return false
  return true
}
