import test from "node:test";
import assert from "node:assert/strict";
import type { Address } from "viem";
import { assertLeasePaymentAllowed, type LeasePaymentState } from "../src/lease-payment-guards.js";

const owner = "0x2222222222222222222222222222222222222222" as Address;
const delegate = "0x359db9b8af6e50b070cd73f4af91bbdf84ba81af" as Address;
const otherDelegate = "0x1111111111111111111111111111111111111111" as Address;

const validLease = (): LeasePaymentState => ({
  owner,
  delegate,
  expiry: 2_000_000_000n,
  revoked: false,
  balance: 1_000_000n,
  remainingAllowance: 1_000_000n,
  allowlistEnabled: true,
  recipientAllowed: true,
});

const check = (lease: LeasePaymentState, overrides: Partial<{
  suppliedDelegate: Address;
  amount: bigint;
  nowSeconds: bigint;
}> = {}) => assertLeasePaymentAllowed({
  lease,
  suppliedDelegate: overrides.suppliedDelegate ?? delegate,
  amount: overrides.amount ?? 100_000n,
  nowSeconds: overrides.nowSeconds ?? 1_900_000_000n,
});

test("allows a payment when every on-chain lease rule is satisfied", () => {
  assert.doesNotThrow(() => check(validLease()));
});

test("rejects a wallet that is not the registered delegate", () => {
  assert.throws(() => check(validLease(), { suppliedDelegate: otherDelegate }), /not the delegate registered/);
});

test("rejects a revoked lease", () => {
  const lease = validLease();
  lease.revoked = true;
  assert.throws(() => check(lease), /revoked/);
});

test("rejects an expired lease", () => {
  assert.throws(() => check(validLease(), { nowSeconds: 2_000_000_000n }), /expired/);
});

test("rejects payment greater than deposited USDC", () => {
  const lease = validLease();
  lease.balance = 50_000n;
  assert.throws(() => check(lease, { amount: 100_000n }), /currently deposited/);
});

test("rejects payment greater than remaining allowance", () => {
  const lease = validLease();
  lease.remainingAllowance = 50_000n;
  assert.throws(() => check(lease, { amount: 100_000n }), /remaining lease allowance/);
});

test("rejects a recipient outside an enabled allowlist", () => {
  const lease = validLease();
  lease.recipientAllowed = false;
  assert.throws(() => check(lease), /allowlist/);
});

test("does not require recipient approval when allowlisting is disabled", () => {
  const lease = validLease();
  lease.allowlistEnabled = false;
  lease.recipientAllowed = false;
  assert.doesNotThrow(() => check(lease));
});

test("rejects a nonexistent lease", () => {
  const lease = validLease();
  lease.owner = "0x0000000000000000000000000000000000000000";
  assert.throws(() => check(lease), /does not exist/);
});
