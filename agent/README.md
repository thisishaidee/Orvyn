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

## Next milestone

Add a dedicated agent wallet and restricted payment action, then connect a language model only to that action. No transaction will be sent until a separate explicit test step.
