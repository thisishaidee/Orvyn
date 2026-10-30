/**
 * Explicit wallet-signed AgentPay transactions.
 *
 * This module never signs silently and never chains approval into a contract
 * action. The caller must wait for approveUsdc() to succeed, then ask the user
 * to confirm the separate AgentPay action.
 */
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  erc20Abi,
  type Address,
  type Hash,
} from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { ARC_USDC_ADDRESS } from '@/lib/wallet'
import { useReadGate } from '@/lib/agentpay-reads'
import { agentPayWriteAbi } from '@/lib/agentpay-write-abi'

export type TransactionResult = {
  hash: Hash
  blockNumber: bigint
}

export type TransactionState =
  | 'disconnected'
  | 'unsupported-network'
  | 'missing-address'
  | 'wallet-unavailable'
  | 'ready'

export function useAgentPayTransactions() {
  const gate = useReadGate()
  const { address: connectedAddress, chainId: walletChainId, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient({ chainId: gate.ok ? gate.chainId : undefined })
  const publicClient = usePublicClient({ chainId: gate.ok ? gate.chainId : undefined })
  const queryClient = useQueryClient()

  let state: TransactionState
  if (!isConnected || !connectedAddress) state = 'disconnected'
  else if (!gate.ok) state = gate.state
  else if (!walletClient || !publicClient) state = 'wallet-unavailable'
  else if (walletChainId !== gate.chainId || walletClient.account?.address.toLowerCase() !== connectedAddress.toLowerCase()) state = 'wallet-unavailable'
  else state = 'ready'

  const assertReady = useCallback(() => {
    if (!gate.ok) throw new Error(gate.reason)
    if (!walletClient || !publicClient || !connectedAddress || walletChainId !== gate.chainId) {
      throw new Error('Connect your wallet on the selected Arc network before submitting a transaction.')
    }
    if (walletClient.account?.address.toLowerCase() !== connectedAddress.toLowerCase()) {
      throw new Error('The active wallet account changed. Reconnect before submitting.')
    }
    return { contract: gate.contract, chainId: gate.chainId, account: connectedAddress }
  }, [gate, walletClient, publicClient, connectedAddress, walletChainId])

  const waitForSuccess = useCallback(async (hash: Hash): Promise<TransactionResult> => {
    if (!publicClient) throw new Error('The Arc network client is unavailable.')
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') {
      throw new Error(`Transaction ${hash} was mined but reverted.`)
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['agentpay', 'leases'] }),
      queryClient.invalidateQueries({ queryKey: ['agentpay', 'activity'] }),
    ])
    return { hash, blockNumber: receipt.blockNumber }
  }, [publicClient, queryClient])

  /** Read the exact USDC allowance granted to this AgentPay contract. */
  const getUsdcAllowance = useCallback(async (): Promise<bigint> => {
    const { contract, account } = assertReady()
    if (!publicClient) throw new Error('The Arc network client is unavailable.')
    return publicClient.readContract({
      address: ARC_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account, contract],
    })
  }, [assertReady, publicClient])

  /** Submit an exact-amount USDC approval. This does not submit the next action. */
  const approveUsdc = useCallback(async (amount: bigint): Promise<TransactionResult> => {
    if (amount <= 0n) throw new Error('Approval amount must be greater than zero.')
    const { contract } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: ARC_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [contract, amount],
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, gate, waitForSuccess])

  const createLease = useCallback(async (args: {
    delegate: Address
    cap: bigint
    periodSeconds: bigint
    expiry: bigint
    allowlistEnabled: boolean
    initialDeposit: bigint
  }): Promise<TransactionResult> => {
    if (args.cap <= 0n || args.periodSeconds <= 0n || args.expiry <= 0n || args.initialDeposit < 0n) {
      throw new Error('Lease values are invalid.')
    }
    const { contract } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'createLease',
      args: [args.delegate, args.cap, args.periodSeconds, args.expiry, args.allowlistEnabled, args.initialDeposit],
      chain: undefined,
      account: connectedAddress!,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, connectedAddress, waitForSuccess])

  const deposit = useCallback(async (leaseId: bigint, amount: bigint): Promise<TransactionResult> => {
    if (leaseId < 0n || amount <= 0n) throw new Error('Lease ID and deposit amount are invalid.')
    const { contract } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'deposit',
      args: [leaseId, amount],
      account: connectedAddress!,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, connectedAddress, waitForSuccess])

  const setAllowlist = useCallback(async (leaseId: bigint, recipient: Address, allowed: boolean): Promise<TransactionResult> => {
    if (leaseId < 0n) throw new Error('Lease ID is invalid.')
    const { contract } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'setAllowlist',
      args: [leaseId, recipient, allowed],
      account: connectedAddress!,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, connectedAddress, waitForSuccess])

  const revoke = useCallback(async (leaseId: bigint): Promise<TransactionResult> => {
    if (leaseId < 0n) throw new Error('Lease ID is invalid.')
    const { contract } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'revoke',
      args: [leaseId],
      account: connectedAddress!,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, connectedAddress, waitForSuccess])

  const withdraw = useCallback(async (leaseId: bigint): Promise<TransactionResult> => {
    if (leaseId < 0n) throw new Error('Lease ID is invalid.')
    const { contract } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'withdraw',
      args: [leaseId],
      account: connectedAddress!,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, connectedAddress, waitForSuccess])

  const spend = useCallback(async (leaseId: bigint, recipient: Address, amount: bigint): Promise<TransactionResult> => {
    if (leaseId < 0n || amount <= 0n) throw new Error('Lease ID and spend amount are invalid.')
    const { contract } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'spend',
      args: [leaseId, recipient, amount],
      account: connectedAddress!,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, connectedAddress, waitForSuccess])

  return {
    state,
    reason: state === 'ready' ? '' : gate.ok ? 'Wallet client is not ready on the connected Arc network.' : gate.reason,
    getUsdcAllowance,
    approveUsdc,
    createLease,
    deposit,
    setAllowlist,
    revoke,
    withdraw,
    spend,
  }
}
