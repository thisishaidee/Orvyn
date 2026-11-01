export type PaymentRequestBody = {
  leaseId: string;
  delegate: string;
  recipient: string;
  amountUsdc: string;
  purpose?: string;
};

/** Validate the transport shape before any RPC calls are made. */
export function parsePaymentRequestBody(value: unknown): PaymentRequestBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Provide a JSON object with leaseId, delegate, recipient and amountUsdc.");
  }
  const body = value as Record<string, unknown>;
  for (const key of ["leaseId", "delegate", "recipient", "amountUsdc"] as const) {
    if (typeof body[key] !== "string" || body[key].trim() === "") {
      throw new Error(`'${key}' must be a non-empty string.`);
    }
  }
  if (!/^\d+$/.test(body.leaseId as string) || BigInt(body.leaseId as string) <= 0n) {
    throw new Error("'leaseId' must be a positive integer string.");
  }
  if (body.purpose !== undefined && (typeof body.purpose !== "string" || body.purpose.length > 240)) {
    throw new Error("'purpose' must be a string of at most 240 characters.");
  }
  return {
    leaseId: body.leaseId as string,
    delegate: body.delegate as string,
    recipient: body.recipient as string,
    amountUsdc: body.amountUsdc as string,
    ...(typeof body.purpose === "string" ? { purpose: body.purpose.trim() } : {})
  };
}
