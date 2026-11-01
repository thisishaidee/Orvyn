import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getAddress, isAddress } from "viem";
import { sendLeasePayment } from "./payment.js";

async function main() {
  const rl = createInterface({ input, output });
  try {
    const leaseIdText = await rl.question("Lease ID: ");
    if (!/^\d+$/.test(leaseIdText) || BigInt(leaseIdText) <= 0n) {
      throw new Error("Enter a positive whole-number lease ID.");
    }

    const recipientText = (await rl.question("Recipient address: ")).trim();
    if (!isAddress(recipientText)) throw new Error("Recipient must be a valid EVM address.");

    const amountUsdc = (await rl.question("Amount in USDC (e.g. 0.01): ")).trim();
    if (!/^\d+(\.\d{1,6})?$/.test(amountUsdc) || Number(amountUsdc) <= 0) {
      throw new Error("Enter a positive USDC amount with no more than 6 decimal places.");
    }

    console.log("\nReview payment request");
    console.log(`Network: Arc Mainnet (5042)`);
    console.log(`Lease: ${leaseIdText}`);
    console.log(`Recipient: ${getAddress(recipientText)}`);
    console.log(`Amount: ${amountUsdc} USDC`);
    console.log("\nThis will submit an on-chain transaction and spend lease funds.");
    const answer = (await rl.question("Type SEND to approve this exact payment: ")).trim();
    if (answer !== "SEND") {
      console.log("Cancelled. No transaction was sent.");
      return;
    }

    const result = await sendLeasePayment({
      leaseId: BigInt(leaseIdText),
      recipient: getAddress(recipientText),
      amountUsdc
    });

    console.log("Payment confirmed on Arc.");
    console.log(`Transaction: ${result.hash}`);
    console.log(`Explorer: ${result.explorerUrl}`);
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error("Payment failed:", error);
  process.exitCode = 1;
});
