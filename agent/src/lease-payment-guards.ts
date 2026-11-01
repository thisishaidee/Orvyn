import type { Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type LeasePaymentState = {
  owner: Address;
  delegate: Address;
  expiry: bigint;
  revoked: boolean;
  balance: bigint;
  remainingAllowance: bigint;
  allowlistEnabled: boolean;
  recipientAllowed: boolean;
};

export function assertLeasePaymentAllowed(input: {
  lease: LeasePaymentState;
  suppliedDelegate: Address;
  amount: bigint;
  nowSeconds: bigint;
}): void {
  const { lease, suppliedDelegate, amount, nowSeconds } = input;

  if (lease.owner.toLowerCase() === ZERO_ADDRESS) {
    throw new Error("Lease does not exist.");
  }
  if (lease.delegate.toLowerCase() !== suppliedDelegate.toLowerCase()) {
    throw new Error("The supplied wallet is not the delegate registered for this lease.");
  }
  if (lease.revoked) throw new Error("Lease has been revoked.");
  if (nowSeconds >= lease.expiry) throw new Error("Lease has expired.");
  if (amount > lease.balance) {
    throw new Error("Payment exceeds the USDC currently deposited in the lease.");
  }
  if (amount > lease.remainingAllowance) {
    throw new Error("Payment exceeds the remaining lease allowance.");
  }
  if (lease.allowlistEnabled && !lease.recipientAllowed) {
    throw new Error("Recipient is not on this lease's allowlist.");
  }
}
