/**
 * Explicit wallet-signed AgentPay transactions.
 *
 * This module never signs silently. Every write is submitted through the
 * connected wallet after the user initiates the action and reviews its prompt.
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
import { agentPayAbi } from '@/lib/agentpay-abi'
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

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

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
      queryClient.invalidateQueries({ queryKey: ['agentpay', 'delegate-leases'] }),
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
    const { contract, account } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: ARC_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [contract, amount],
      account,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, waitForSuccess])

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
    const { contract, account } = assertReady()
    if (args.initialDeposit > 0n) {
      const allowance = await getUsdcAllowance()
      if (allowance < args.initialDeposit) throw new Error('USDC approval is insufficient. Approve the exact initial deposit first, wait for confirmation, then submit lease creation.')
    }
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'createLease',
      args: [args.delegate, args.cap, args.periodSeconds, args.expiry, args.allowlistEnabled, args.initialDeposit],
      account,
    })
    return waitForSuccess(hash)
  }, [assertReady, getUsdcAllowance, walletClient, waitForSuccess])

  const deposit = useCallback(async (leaseId: bigint, amount: bigint): Promise<TransactionResult> => {
    if (leaseId < 0n || amount <= 0n) throw new Error('Lease ID and deposit amount are invalid.')
    const { contract, account } = assertReady()
    const allowance = await getUsdcAllowance()
    if (allowance < amount) throw new Error('USDC approval is insufficient. Approve the exact deposit amount first, wait for confirmation, then submit the deposit.')
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'deposit',
      args: [leaseId, amount],
      account,
    })
    return waitForSuccess(hash)
  }, [assertReady, getUsdcAllowance, walletClient, waitForSuccess])

  const setAllowlist = useCallback(async (leaseId: bigint, recipient: Address, allowed: boolean): Promise<TransactionResult> => {
    if (leaseId < 0n) throw new Error('Lease ID is invalid.')
    const { contract, account } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'setAllowlist',
      args: [leaseId, recipient, allowed],
      account,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, waitForSuccess])

  const revoke = useCallback(async (leaseId: bigint): Promise<TransactionResult> => {
    if (leaseId < 0n) throw new Error('Lease ID is invalid.')
    const { contract, account } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'revoke',
      args: [leaseId],
      account,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, waitForSuccess])

  const withdraw = useCallback(async (leaseId: bigint): Promise<TransactionResult> => {
    if (leaseId < 0n) throw new Error('Lease ID is invalid.')
    const { contract, account } = assertReady()
    if (!walletClient) throw new Error('The wallet client is unavailable.')
    const hash = await walletClient.writeContract({
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'withdraw',
      args: [leaseId],
      account,
    })
    return waitForSuccess(hash)
  }, [assertReady, walletClient, waitForSuccess])

  /**
   * Validate the live on-chain lease and simulate the exact spend before
   * opening the delegate wallet confirmation. The contract remains the final
   * enforcement boundary; these checks only provide clearer preflight errors.
   */
  const spend = useCallback(async (leaseId: bigint, recipient: Address, amount: bigint): Promise<TransactionResult> => {
    if (leaseId <= 0n || amount <= 0n) throw new Error('Lease ID and spend amount must be positive.')
    const { contract, account } = assertReady()
    if (!walletClient || !publicClient) throw new Error('The delegate wallet client is unavailable.')

    const [lease, remaining, block] = await Promise.all([
      publicClient.readContract({ address: contract, abi: agentPayAbi, functionName: 'leases', args: [leaseId] }),
      publicClient.readContract({ address: contract, abi: agentPayAbi, functionName: 'remainingAllowance', args: [leaseId] }),
      publicClient.getBlock({ blockTag: 'latest' }),
    ])

    const [owner, delegate, , , expiry, , , , balance, allowlistEnabled, revoked] = lease
    if (owner.toLowerCase() === ZERO_ADDRESS) throw new Error('This lease does not exist.')
    if (delegate.toLowerCase() !== account.toLowerCase()) throw new Error('The connected wallet is not the delegate assigned to this lease.')
    if (revoked) throw new Error('This lease has been revoked by its owner.')
    if (block.timestamp >= expiry) throw new Error('This lease has expired.')
    if (amount > balance) throw new Error('The payment exceeds the USDC currently held in this lease.')
    if (amount > remaining) throw new Error('The payment exceeds the remaining spending allowance.')

    if (allowlistEnabled) {
      const allowed = await publicClient.readContract({
        address: contract,
        abi: agentPayAbi,
        functionName: 'allowedRecipients',
        args: [leaseId, recipient],
      })
      if (!allowed) throw new Error('This recipient has not been approved by the lease owner.')
    }

    const { request } = await publicClient.simulateContract({
      account,
      address: contract,
      abi: agentPayWriteAbi,
      functionName: 'spend',
      args: [leaseId, recipient, amount],
    })
    const hash = await walletClient.writeContract(request)
    return waitForSuccess(hash)
  }, [assertReady, walletClient, publicClient, waitForSuccess])

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
