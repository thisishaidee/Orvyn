// Safety-logic tests for the browser deploy page: account/network switching,
// receipt-polling failures and duplicate-deployment prevention.

import { describe, expect, test } from 'bun:test'
import {
  ARC_MAINNET_CHAIN_ID,
  canStartDeployment,
  checksStale,
  classifyReceiptError,
  classifyReceiptStatus,
  gasLimitWithBuffer,
  isDeployNavVisible,
  isExpectedDeployer,
  isSaneGasEstimate,
  MAX_GAS_LIMIT,
  MAX_SANE_GAS_ESTIMATE,
  parseSavedDeployment,
  serializeSavedDeployment,
  type DeployInputs,
  type SavedDeployment,
} from '../src/lib/agentpay-deploy'

const DEPLOYER = '0xCB2A51B4D34cC6f5dd574F7b5BfA8260E4201C55'
const ok = { status: 'ok', detail: DEPLOYER } as const

const base = (over: Partial<DeployInputs> = {}): DeployInputs => ({
  phase: 'review',
  account: DEPLOYER,
  chainId: ARC_MAINNET_CHAIN_ID,
  deployerCheck: ok,
  usdcCheck: ok,
  gasEstimate: 500000n,
  ...over,
})

describe('isExpectedDeployer', () => {
  test('accepts checksum and lowercase forms of the deployer', () => {
    expect(isExpectedDeployer(DEPLOYER)).toBe(true)
    expect(isExpectedDeployer(DEPLOYER.toLowerCase())).toBe(true)
  })
  test('rejects other accounts and disconnected wallet', () => {
    expect(isExpectedDeployer('0x0000000000000000000000000000000000000001')).toBe(false)
    expect(isExpectedDeployer(undefined)).toBe(false)
  })
})

describe('account switched after checks passed', () => {
  test('stale checks block deployment and require fresh checks', () => {
    expect(checksStale(base({ account: '0x0000000000000000000000000000000000000001' }))).toBe(true)
    // Even though the old checks still say "ok", the new account must not deploy.
    expect(canStartDeployment(base({ account: '0x0000000000000000000000000000000000000001' }))).toBe(false)
  })
  test('disconnecting the wallet blocks deployment', () => {
    expect(checksStale(base({ account: undefined }))).toBe(true)
    expect(canStartDeployment(base({ account: undefined }))).toBe(false)
  })
})

describe('network switched after checks passed', () => {
  test('a non-mainnet chain blocks deployment', () => {
    expect(checksStale(base({ chainId: 5042002 }))).toBe(true)
    expect(canStartDeployment(base({ chainId: 5042002 }))).toBe(false)
  })
  test('an unknown chain blocks deployment', () => {
    expect(canStartDeployment(base({ chainId: 1 }))).toBe(false)
  })
})

describe('receipt polling failure after submission', () => {
  test('receipt-not-found keeps the transaction pending, deployment stays blocked', () => {
    const out = classifyReceiptError(new Error('Transaction receipt with hash 0xabc not found.'))
    expect(out.kind).toBe('pending')
  })
  test('an RPC error leaves the outcome unknown, deployment stays blocked', () => {
    const out = classifyReceiptError(new Error('HTTP request failed: rate limited'))
    expect(out.kind).toBe('unknown')
    expect((out as { reason: string }).reason).toContain('rate limited')
  })
  test('a reverted receipt is a known failure and may re-enable deployment', () => {
    expect(classifyReceiptStatus('reverted', undefined).kind).toBe('reverted')
  })
  test('a success receipt without a contract address is unknown, not a redeploy', () => {
    expect(classifyReceiptStatus('success', undefined).kind).toBe('unknown')
  })
})

describe('duplicate deployment prevention', () => {
  test('pending phase blocks a second deployment', () => {
    expect(canStartDeployment(base({ phase: 'pending' }))).toBe(false)
  })
  test('signing phase blocks a second deployment', () => {
    expect(canStartDeployment(base({ phase: 'signing' }))).toBe(false)
  })
  test('deployed phase blocks redeployment', () => {
    expect(canStartDeployment(base({ phase: 'deployed' }))).toBe(false)
  })
  test('a known-reverted transaction may return to review', () => {
    // The page only re-enters 'review' after classifyReceiptStatus returns
    // 'reverted'; from then on normal gating applies again.
    expect(canStartDeployment(base({ phase: 'review' }))).toBe(true)
  })
  test('all checks must be ok before deployment', () => {
    expect(canStartDeployment(base({ deployerCheck: { status: 'idle' } }))).toBe(false)
    expect(canStartDeployment(base({ usdcCheck: { status: 'fail', detail: 'x' } }))).toBe(false)
    expect(canStartDeployment(base({ gasEstimate: undefined }))).toBe(false)
  })
})

describe('gas limit buffer', () => {
  test('adds a 20% buffer, rounded up', () => {
    expect(gasLimitWithBuffer(1_000_000n)).toBe(1_200_000n)
    expect(gasLimitWithBuffer(1_182_001n)).toBe(1_418_402n)
    expect(gasLimitWithBuffer(1n)).toBe(2n)
  })
  test('never exceeds the hard cap', () => {
    expect(gasLimitWithBuffer(MAX_SANE_GAS_ESTIMATE)).toBe(MAX_GAS_LIMIT)
  })
  test('refuses zero and absurdly large estimates', () => {
    expect(() => gasLimitWithBuffer(0n)).toThrow()
    expect(() => gasLimitWithBuffer(MAX_SANE_GAS_ESTIMATE + 1n)).toThrow()
    expect(isSaneGasEstimate(undefined)).toBe(false)
    expect(isSaneGasEstimate(0n)).toBe(false)
    expect(isSaneGasEstimate(1_182_001n)).toBe(true)
  })
  test('an insane estimate blocks deployment', () => {
    expect(canStartDeployment(base({ gasEstimate: MAX_SANE_GAS_ESTIMATE + 1n }))).toBe(false)
    expect(canStartDeployment(base({ gasEstimate: 0n }))).toBe(false)
    expect(canStartDeployment(base({ gasEstimate: 1_182_001n }))).toBe(true)
  })
})

const HASH = `0x${'ab'.repeat(32)}` as const
const CONTRACT = '0x1111111111111111111111111111111111111111' as const
const savedBase = (over: Partial<SavedDeployment> = {}): SavedDeployment => ({
  v: 1,
  txHash: HASH,
  chainId: ARC_MAINNET_CHAIN_ID,
  deployer: DEPLOYER,
  phase: 'pending',
  savedAt: 1_700_000_000_000,
  ...over,
})

describe('saved deployment state', () => {
  test('round-trips pending and deployed records', () => {
    const pending = savedBase()
    expect(parseSavedDeployment(serializeSavedDeployment(pending))).toEqual({ ...pending, contractAddress: undefined })
    const deployed = savedBase({ phase: 'deployed', contractAddress: CONTRACT })
    expect(parseSavedDeployment(serializeSavedDeployment(deployed))).toEqual(deployed)
  })
  test('stores only public fields, never anything extra', () => {
    const dirty = { ...savedBase(), privateKey: 'nope', seed: 'nope', signature: 'nope' } as unknown as SavedDeployment
    const json = serializeSavedDeployment(dirty)
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(['chainId', 'deployer', 'phase', 'savedAt', 'txHash', 'v'])
    expect(json.includes('nope')).toBe(false)
  })
  test('ignores missing, malformed or foreign records', () => {
    expect(parseSavedDeployment(null)).toBeUndefined()
    expect(parseSavedDeployment('')).toBeUndefined()
    expect(parseSavedDeployment('{not json')).toBeUndefined()
    expect(parseSavedDeployment('[]')).toBeUndefined()
    const raw = (over: object) => JSON.stringify({ ...savedBase(), ...over })
    expect(parseSavedDeployment(raw({ chainId: 1 }))).toBeUndefined()
    expect(parseSavedDeployment(raw({ deployer: '0x2222222222222222222222222222222222222222' }))).toBeUndefined()
    expect(parseSavedDeployment(raw({ txHash: '0x1234' }))).toBeUndefined()
    expect(parseSavedDeployment(raw({ phase: 'unknown' }))).toBeUndefined()
    expect(parseSavedDeployment(raw({ v: 2 }))).toBeUndefined()
    expect(parseSavedDeployment(raw({ contractAddress: 'nope' }))).toBeUndefined()
    expect(parseSavedDeployment(raw({ phase: 'deployed' }))).toBeUndefined()
  })
  test('a saved pending transaction keeps deployment blocked after a reload', () => {
    expect(canStartDeployment(base({ phase: 'pending' }))).toBe(false)
    expect(canStartDeployment(base({ phase: 'deployed' }))).toBe(false)
    expect(canStartDeployment(base({ phase: 'failed' }))).toBe(true)
  })
})

describe('Deploy navigation visibility', () => {
  test('visible before deployment', () => {
    expect(isDeployNavVisible({ configuredAddress: undefined, saved: undefined })).toBe(true)
    expect(isDeployNavVisible({ configuredAddress: undefined, saved: savedBase() })).toBe(true)
    expect(isDeployNavVisible({ configuredAddress: undefined, saved: savedBase({ phase: 'failed' }) })).toBe(true)
  })
  test('hidden once an address is configured or a deployment is recorded', () => {
    expect(isDeployNavVisible({ configuredAddress: CONTRACT, saved: undefined })).toBe(false)
    expect(isDeployNavVisible({ configuredAddress: undefined, saved: savedBase({ phase: 'deployed', contractAddress: CONTRACT }) })).toBe(false)
  })
})
