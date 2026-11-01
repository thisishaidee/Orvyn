import "dotenv/config";
import {
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  parseUnits,
  type Address,
  type Hex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { agentPayAbi } from "./agentpay-abi.js";
import { arcMainnet, agentPayAddress, publicClient } from "./chain.js";

function loadDelegateAccount() {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) throw new Error("AGENT_PRIVATE_KEY is not configured in the local agent/.env file.");
  return privateKeyToAccount(key as Hex);
}

export type PaymentRequest = {
  leaseId: bigint;
  recipient: Address;
  amountUsdc: string;
};

export async function sendLeasePayment(request: PaymentRequest) {
  if (request.leaseId <= 0n) throw new Error("Lease ID must be a positive integer.");

  const recipient = getAddress(request.recipient);
  if (recipient === "0x0000000000000000000000000000000000000000") {
    throw new Error("Recipient cannot be the zero address.");
  }

  const amount = parseUnits(request.amountUsdc, 6);
  if (amount <= 0n) throw new Error("Payment amount must be greater than zero.");

  const account = loadDelegateAccount();
  const chainId = await publicClient.getChainId();
  if (chainId !== 5042) throw new Error(`Wrong network: expected Arc Mainnet 5042, received ${chainId}.`);

  const lease = await publicClient.readContract({
    address: agentPayAddress,
    abi: agentPayAbi,
    functionName: "leases",
    args: [request.leaseId]
  });

  if (lease.owner === "0x0000000000000000000000000000000000000000") {
    throw new Error("Lease does not exist.");
  }
  if (lease.delegate.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error("This agent wallet is not the delegate registered for that lease.");
  }
  if (lease.revoked) throw new Error("Lease has been revoked.");

  const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
  if (latestBlock.timestamp >= lease.expiry) throw new Error("Lease has expired.");

  if (lease.allowlistEnabled) {
    const allowed = await publicClient.readContract({
      address: agentPayAddress,
      abi: agentPayAbi,
      functionName: "allowedRecipients",
      args: [request.leaseId, recipient]
    });
    if (!allowed) throw new Error("Recipient is not on this lease's allowlist.");
  }

  const allowance = await publicClient.readContract({
    address: agentPayAddress,
    abi: agentPayAbi,
    functionName: "remainingAllowance",
    args: [request.leaseId]
  });
  if (amount > allowance) {
    throw new Error(`Payment exceeds remaining lease allowance (${formatUnits(allowance, 6)} USDC).`);
  }

  const walletClient = createWalletClient({
    account,
    chain: arcMainnet,
    transport: http(process.env.ARC_RPC_URL ?? "https://rpc.mainnet.arc.io")
  });

  const { request: simulatedRequest } = await publicClient.simulateContract({
    account,
    address: agentPayAddress,
    abi: agentPayAbi,
    functionName: "spend",
    args: [request.leaseId, recipient, amount]
  });

  const hash = await walletClient.writeContract(simulatedRequest);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error(`Payment transaction reverted: ${hash}`);
  }

  return {
    hash,
    leaseId: request.leaseId.toString(),
    recipient,
    amountUsdc: request.amountUsdc,
    agentWallet: account.address,
    explorerUrl: `https://explorer.arc.network/tx/${hash}`
  };
}
