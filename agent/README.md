# Orvynn Minimal Agent

A restricted, read-only payment-request service for Orvynn AgentPay on Arc Mainnet.

## Current architecture

The agent does **not** hold a wallet private key and cannot sign or submit transactions.

1. An agent or user proposes a payment: lease ID, delegate wallet, recipient and amount.
2. The agent reads the live AgentPay lease from Arc.
3. It checks delegate identity, lease existence, revocation, expiry, recipient allowlist, deposited balance and remaining allowance.
4. It simulates the exact `spend()` call. Simulation is read-only.
5. It returns a structured payment intent.
6. The connected delegate wallet reviews and signs the transaction in Orvynn. The smart contract enforces the rules again on-chain.

This is the phone-first, non-custodial design. The agent can prepare a request, but it cannot move funds. A future AI model can call this narrow preparation capability; the wallet confirmation remains a separate approval boundary.

## Configuration

Copy `.env.example` to `.env` if you need to override the public Arc RPC or contract addresses. No private key or wallet secret is required.

## Run

```sh
npm install
npm run typecheck
npm run dev
```

## Security boundaries

- No private key generation, storage, import or signing in this package.
- No general-purpose USDC transfer capability.
- No owner functions such as `createLease`, `deposit`, `setAllowlist`, `revoke` or `withdraw`.
- Only the connected delegate wallet can authorise the final `spend()` transaction.
- The contract is the final enforcement boundary for delegate identity, lease status, expiry, allowlist, spending cap and lease balance.
- The agent's preflight checks improve error messages but do not replace contract enforcement.

## Current limitation

This package currently prepares and validates payment intents; it does not yet include an LLM or autonomous task planner. AI-driven payment proposals are a separate integration milestone. Never describe the current flow as autonomous agent signing.
