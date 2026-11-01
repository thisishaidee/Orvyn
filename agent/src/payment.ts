import "dotenv/config";
import { formatUnits, type Address } from "viem";
import { agentPayAbi } from "./agentpay-abi.js";
import { agentPayAddress, publicClient } from "./chain.js";
import { validatePaymentInput } from "./payment-validation.js";

/**
 * A validated payment intent. It is data for the connected delegate wallet
 * to review and sign; it is not a signed transaction and cannot move funds.
 */
export type PreparedPayment = {
  leaseId: string;
  delegate: Address;
  recipient: Address;
  amountUsdc: string;
  amountBaseUnits: string;
  remainingAllowanceUsdc: string;
  contract: Address;
  chainId: 5042;
  requiresDelegateWalletConfirmation: true;
};

export type PaymentRequest = {
  leaseId: bigint;
  delegate: Address;
  recipient: Address;
  amountUsdc: string;
};

export async function prepareLeasePayment(request: PaymentRequest): Promise<PreparedPayment> {
  const input = validatePaymentInput(request);

  const chainId = await publicClient.getChainId();
  if (chainId !== 5042) throw new Error(`Wrong network: expected Arc Mainnet 5042, received ${chainId}.`);

  const [lease, allowance, latestBlock] = await Promise.all([
    publicClient.readContract({
      address: agentPayAddress,
      abi: agentPayAbi,
      functionName: "leases",
      args: [input.leaseId]
    }),
    publicClient.readContract({
      address: agentPayAddress,
      abi: agentPayAbi,
      functionName: "remainingAllowance",
      args: [request.leaseId]
    }),
    publicClient.getBlock({ blockTag: "latest" })
  ]);
  const [owner, registeredDelegate, , , expiry, , , , balance, allowlistEnabled, revoked] = lease;

  if (owner === "0x0000000000000000000000000000000000000000") {
    throw new Error("Lease does not exist.");
  }
  if (registeredDelegate.toLowerCase() !== input.delegate.toLowerCase()) {
    throw new Error("The supplied wallet is not the delegate registered for this lease.");
  }
  if (revoked) throw new Error("Lease has been revoked.");
  if (latestBlock.timestamp >= expiry) throw new Error("Lease has expired.");
  if (input.amount > balance) throw new Error("Payment exceeds the USDC currently deposited in the lease.");
  if (input.amount > allowance) {
    throw new Error(`Payment exceeds remaining lease allowance (${formatUnits(allowance, 6)} USDC).`);
  }

  if (allowlistEnabled) {
    const allowed = await publicClient.readContract({
      address: agentPayAddress,
      abi: agentPayAbi,
      functionName: "allowedRecipients",
      args: [input.leaseId, input.recipient]
    });
    if (!allowed) throw new Error("Recipient is not on this lease's allowlist.");
  }

  // Simulate the exact call to catch contract-level reverts before asking the
  // delegate wallet to sign. Simulation is read-only and sends no transaction.
  await publicClient.simulateContract({
    account: input.delegate,
    address: agentPayAddress,
    abi: agentPayAbi,
    functionName: "spend",
    args: [input.leaseId, input.recipient, input.amount]
  });

  return {
    leaseId: input.leaseId.toString(),
    delegate: input.delegate,
    recipient: input.recipient,
    amountUsdc: input.amountUsdc,
    amountBaseUnits: input.amount.toString(),
    remainingAllowanceUsdc: formatUnits(allowance, 6),
    contract: agentPayAddress,
    chainId: 5042,
    requiresDelegateWalletConfirmation: true
  };
}
