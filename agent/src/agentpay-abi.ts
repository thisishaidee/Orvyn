import { parseAbi } from "viem";

/**
 * Minimal agent-facing interface.
 * Deliberately excludes owner controls such as createLease, revoke and withdraw.
 */
export const agentPayAbi = parseAbi([
  "function spend(uint256 leaseId, address recipient, uint256 amount)",
  "function remainingAllowance(uint256 leaseId) view returns (uint256)",
  "function leases(uint256 leaseId) view returns (address owner, address delegate, uint256 cap, uint256 periodSeconds, uint256 expiry, uint256 spentInPeriod, uint256 periodStart, uint256 balance, bool allowlistEnabled, bool revoked)",
  "function allowedRecipients(uint256 leaseId, address recipient) view returns (bool)"
]);

export const erc20ReadAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)"
]);
