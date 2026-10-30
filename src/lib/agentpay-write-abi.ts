/**
 * AgentPay write ABI, derived from contracts/AgentPay.sol.
 * These functions are used only after explicit user confirmation in the wallet.
 * No transaction is submitted automatically by importing this file.
 */
export const agentPayWriteAbi = [
  {
    type: 'function',
    name: 'createLease',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'delegate', type: 'address' },
      { name: 'cap', type: 'uint256' },
      { name: 'periodSeconds', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'allowlistEnabled', type: 'bool' },
      { name: 'initialDeposit', type: 'uint256' },
    ],
    outputs: [{ name: 'leaseId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'leaseId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setAllowlist',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'leaseId', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'allowed', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revoke',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'leaseId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'leaseId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'spend',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'leaseId', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const
