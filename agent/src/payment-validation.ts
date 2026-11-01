import { getAddress, parseUnits, type Address } from "viem";

export type ValidatedPaymentInput = {
  leaseId: bigint;
  delegate: Address;
  recipient: Address;
  amount: bigint;
  amountUsdc: string;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Pure input validation: no RPC calls and no wallet access. */
export function validatePaymentInput(input: {
  leaseId: bigint;
  delegate: string;
  recipient: string;
  amountUsdc: string;
}): ValidatedPaymentInput {
  if (input.leaseId <= 0n) throw new Error("Lease ID must be a positive integer.");

  let delegate: Address;
  let recipient: Address;
  try {
    delegate = getAddress(input.delegate);
    recipient = getAddress(input.recipient);
  } catch {
    throw new Error("Delegate and recipient must be valid wallet addresses.");
  }

  if (delegate.toLowerCase() === ZERO_ADDRESS) {
    throw new Error("Delegate cannot be the zero address.");
  }
  if (recipient.toLowerCase() === ZERO_ADDRESS) {
    throw new Error("Recipient cannot be the zero address.");
  }
  if (!/^\\d+(\\.\\d{1,6})?$/.test(input.amountUsdc)) {
    throw new Error("Enter a positive USDC amount with up to six decimal places.");
  }

  const amount = parseUnits(input.amountUsdc, 6);
  if (amount <= 0n) throw new Error("Payment amount must be greater than zero.");

  return {
    leaseId: input.leaseId,
    delegate,
    recipient,
    amount,
    amountUsdc: input.amountUsdc
  };
}
