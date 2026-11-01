# Orvynn Minimal Agent

A standalone TypeScript package inside the Orvynn repository. It is being built as the restricted delegate agent for Arc Mainnet.

## Current stage

This milestone is read-only. It verifies Arc Mainnet connectivity (chain ID 5042), contract code at the deployed AgentPay address, and the Arc USDC contract with 6 decimals. It does not create a wallet, load a private key, or send transactions.

## Configuration

Copy `.env.example` to `.env`. Keep real secrets in the local `.env`; the repository ignores it. The public Arc settings are already provided as defaults.

## Run

```sh
npm install
npm run typecheck
npm run dev
```

## Security design

- The agent will receive only a narrow payment capability calling AgentPay `spend(leaseId, recipient, amount)`.
- It must not receive general-purpose token transfer tools.
- Owner actions (`createLease`, `revoke`, `withdraw`, and lease funding) remain outside the agent.
- AgentPay enforces delegate identity, lease status, expiry, recipient allowlist, spending cap, and available balance.
- Never commit or share an agent private key. Never put secrets in source code, chat messages, screenshots, or GitHub issues.

## Agent wallet preparation

After the read-only checks pass, create `agent/.env` from `.env.example`, then run:

```sh
npm run wallet:create
```

The generator writes a fresh private key into the local ignored `.env` file with restrictive file permissions and prints only the public wallet address. It refuses to overwrite an existing configured key. Do not run this on a shared or untrusted computer. Do not send the private key to anyone.

Creating the wallet does not fund it, connect it to a lease, or send a transaction.

## Restricted payment capability

`src/payment.ts` exports `sendLeasePayment()`. It is the only transaction-writing capability in this package. Before signing, it checks the Arc chain ID, verifies that the configured agent wallet is the lease delegate, checks lease existence/revocation/expiry, enforces the recipient allowlist when enabled, checks the live remaining allowance, and simulates the contract call. It then submits only AgentPay `spend()` and waits for the receipt.

Every call must include `confirmed: true`. This is an operator confirmation gate, not a substitute for the contract's on-chain protections. Do not connect an LLM to this function until a separate approval flow is designed and tested. The function has not been executed against a funded lease.

## Next milestone

Run the automated TypeScript and read-only network checks. Then securely create the delegate wallet locally, register its public address in a new Orvynn lease, and test a tiny payment only after the operator reviews and confirms the transaction.
