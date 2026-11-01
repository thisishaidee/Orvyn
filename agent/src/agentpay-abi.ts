import { parseAbi } from "viem";

/**
 * Minimal agent-facing interface.
 * The public Lease getter follows the exact Solidity struct field order.
 * Owner-only functions such as createLease, revoke and withdraw are excluded.
 */
export const agentPayAbi = parseAbi([
  "function spend(uint256 leaseId, address recipient, uint256 amount)",
  "function remainingAllowance(uint256 leaseId) view returns (uint256)",
  "function leases(uint256 leaseId) view returns (address owner, address delegate, uint256 cap, uint256 periodSeconds, uint256 expiry, uint256 windowStart, uint256 lastWindowIndex, uint256 spentThisWindow, uint256 balance, bool allowlistEnabled, bool revoked)",
  "function allowedRecipients(uint256 leaseId, address recipient) view returns (bool)"
]);

export const erc20ReadAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)"
]);
