import test from "node:test";
import assert from "node:assert/strict";
import { validatePaymentInput } from "../src/payment-validation.js";

const delegate = "0x359db9b8af6e50b070cd73f4af91bbdf84ba81af";
const recipient = "0xCB2A51B4D34cC6f5dd574F7b5bFA8260E4201C55";

test("accepts a valid USDC payment and converts six decimals", () => {
  const result = validatePaymentInput({
    leaseId: 1n,
    delegate,
    recipient,
    amountUsdc: "0.1"
  });
  assert.equal(result.amount, 100000n);
  assert.equal(result.leaseId, 1n);
  assert.equal(result.delegate.toLowerCase(), delegate.toLowerCase());
});

test("rejects a zero or negative lease ID", () => {
  assert.throws(() => validatePaymentInput({
    leaseId: 0n, delegate, recipient, amountUsdc: "1"
  }), /Lease ID/);
  assert.throws(() => validatePaymentInput({
    leaseId: -1n, delegate, recipient, amountUsdc: "1"
  }), /Lease ID/);
});

test("rejects malformed wallet addresses", () => {
  assert.throws(() => validatePaymentInput({
    leaseId: 1n, delegate: "not-an-address", recipient, amountUsdc: "1"
  }), /valid wallet addresses/);
});

test("rejects zero-address delegate and recipient", () => {
  const zero = "0x0000000000000000000000000000000000000000";
  assert.throws(() => validatePaymentInput({
    leaseId: 1n, delegate: zero, recipient, amountUsdc: "1"
  }), /Delegate cannot be the zero address/);
  assert.throws(() => validatePaymentInput({
    leaseId: 1n, delegate, recipient: zero, amountUsdc: "1"
  }), /Recipient cannot be the zero address/);
});

test("rejects zero, negative, malformed and over-precision amounts", () => {
  for (const amountUsdc of ["0", "0.0000000", "-1", "1e-3", "1.", ".1", "1.0000001"]) {
    assert.throws(() => validatePaymentInput({
      leaseId: 1n, delegate, recipient, amountUsdc
    }));
  }
});

test("accepts the smallest six-decimal unit", () => {
  const result = validatePaymentInput({
    leaseId: 1n, delegate, recipient, amountUsdc: "0.000001"
  });
  assert.equal(result.amount, 1n);
});
