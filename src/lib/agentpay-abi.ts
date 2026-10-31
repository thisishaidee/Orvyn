/**
 * AgentPay ABI, derived strictly from contracts/AgentPay.sol.
 * Read functions and events only. No write functions are exposed here.
 *
 * Lease struct order matches the Solidity struct:
 * owner, delegate, cap, periodSeconds, expiry, windowStart,
 * lastWindowIndex, spentThisWindow, balance, allowlistEnabled, revoked.
 */

export const agentPayAbi = [
  {
    type: 'function',
    name: 'nextLeaseId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'leases',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'delegate', type: 'address' },
      { name: 'cap', type: 'uint256' },
      { name: 'periodSeconds', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'windowStart', type: 'uint256' },
      { name: 'lastWindowIndex', type: 'uint256' },
      { name: 'spentThisWindow', type: 'uint256' },
      { name: 'balance', type: 'uint256' },
      { name: 'allowlistEnabled', type: 'bool' },
      { name: 'revoked', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'remainingAllowance',
    stateMutability: 'view',
    inputs: [{ name: 'leaseId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowedRecipients',
    stateMutability: 'view',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'event',
    name: 'LeaseCreated',
    inputs: [
      { name: 'leaseId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'delegate', type: 'address', indexed: true },
      { name: 'cap', type: 'uint256', indexed: false },
      { name: 'periodSeconds', type: 'uint256', indexed: false },
      { name: 'expiry', type: 'uint256', indexed: false },
      { name: 'allowlistEnabled', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Spent',
    inputs: [
      { name: 'leaseId', type: 'uint256', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Revoked',
    inputs: [{ name: 'leaseId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'leaseId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'leaseId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AllowlistUpdated',
    inputs: [
      { name: 'leaseId', type: 'uint256', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'allowed', type: 'bool', indexed: false },
    ],
  },
] as const
