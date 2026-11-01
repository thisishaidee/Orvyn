import test from "node:test";
import assert from "node:assert/strict";
import { parsePaymentRequestBody } from "../src/payment-request.js";

const valid = {
  leaseId: "12",
  delegate: "0x359db9b8af6e50b070cd73f4af91bbdf84ba81af",
  recipient: "0x2222222222222222222222222222222222222222",
  amountUsdc: "2.5",
  purpose: "Pay for completed work"
};

test("accepts a complete payment request and preserves its purpose", () => {
  assert.deepEqual(parsePaymentRequestBody(valid), valid);
});

test("rejects non-object payloads", () => {
  assert.throws(() => parsePaymentRequestBody(null), /JSON object/);
});

test("rejects zero or malformed lease IDs", () => {
  assert.throws(() => parsePaymentRequestBody({ ...valid, leaseId: "0" }), /positive integer/);
  assert.throws(() => parsePaymentRequestBody({ ...valid, leaseId: "1.2" }), /positive integer/);
});

test("rejects missing required fields", () => {
  const { recipient: _recipient, ...incomplete } = valid;
  assert.throws(() => parsePaymentRequestBody(incomplete), /recipient/);
});

test("rejects oversized purpose text", () => {
  assert.throws(() => parsePaymentRequestBody({ ...valid, purpose: "x".repeat(241) }), /240 characters/);
});
