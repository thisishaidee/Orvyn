# AgentPay

> Built with Arc Studio - money-powered apps in minutes

Project memory for AgentPay, a USDC spending-lease contract for AI agents on Arc.

## What This Project Does

An owner creates a lease for a delegate (an AI agent wallet) with a USDC spending cap per period, a period length, an expiry, and an optional recipient allowlist. The delegate can spend only within those limits; the owner can top up, revoke, and withdraw at any time. There is no admin and no upgrade path.

## Tech Stack

- Contracts: Solidity 0.8.28 (Cancun, optimizer 200 runs), OpenZeppelin 5.6.1, Foundry. Sources in `contracts/`, tests in `contracts/test/` (90 tests: unit, window, fuzz, invariant).
- Frontend (not built yet): React, Vite, TypeScript, Tailwind, wagmi, viem, ConnectKit.
- Chain: Arc mainnet (chain ID 5042). Token: USDC ERC-20 view, 6 decimals, `0x3600000000000000000000000000000000000000` (set in `contracts/AgentPayConfig.sol`).

## Key Files

- `contracts/AgentPay.sol`, `contracts/AgentPayConfig.sol`
- `contracts/script/DeployAgentPay.s.sol`: deploy script (chain ID guard, key-matches-address guard)
- `docs/deploy-agentpay-mainnet.md`: deploy steps
- `scripts/check-deploy-env.ts`: validates local `.env` and runs read-only live checks
- `src/`: frontend starter (still the empty placeholder)

## Run

```bash
bun install
bun run contracts:build
bun run contracts:test
bun run dev
```

## Status and Decisions

- Deployment to Arc mainnet is NOT done yet. Confirm the wallet shows chain ID 5042 (gas priced in USDC) before every transaction.
- Mainnet deployment is done by the owner outside Arc Studio, from their own wallet.
- Secrets: the deployer private key lives only in a local, git-ignored `.env`. Never commit `.env`; `.env.example` is the template and must stay empty of secrets.
