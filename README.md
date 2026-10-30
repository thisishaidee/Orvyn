# AgentPay

AgentPay is a USDC spending-lease application for AI-agent delegates on Arc. A wallet owner creates a lease with a delegate, a per-period spending cap, an expiry, and an optional recipient allowlist. The delegate can spend within those rules; the owner can add funds, update recipient permissions, revoke the lease, or withdraw the remaining balance.

Built with [Arc Studio](https://studio.arc.io).

## Networks

- Arc Mainnet — chain ID `5042`
- Arc Testnet — chain ID `5042002`

The frontend supports these two Arc networks only. Ethereum is not a supported AgentPay network.

The configured USDC ERC-20 address is `0x3600000000000000000000000000000000000000` with 6 decimals. The contract and deployment scripts verify that the token contract exists and reports the expected decimals before deployment.

## Stack

- Solidity 0.8.20-compatible contract source and OpenZeppelin
- Foundry for contract builds, tests, and deployment scripts
- React, Vite, TypeScript, Tailwind CSS
- wagmi and viem for wallet connection, reads, and wallet-confirmed transactions

## Frontend setup

Prerequisites: Bun.

```bash
bun install
bun run dev
```

The app can connect external wallets and switch between Arc Mainnet and Arc Testnet. Contract reads and transaction actions require a real AgentPay deployment address for the selected network.

Set these frontend variables only after deploying the contract:

- `VITE_AGENTPAY_ADDRESS_MAINNET`
- `VITE_AGENTPAY_ADDRESS_TESTNET`

Leave them empty until a deployment has been independently verified. The app intentionally does not invent or hardcode a contract address.

## Build and test

```bash
bun run typecheck
bun run build
forge build
forge test
```

## Arc Testnet deployment

The repository includes `contracts/script/DeployAgentPayTestnet.s.sol`, which checks chain ID `5042002`, verifies the deployer address matches the supplied local private key, checks the USDC contract and its decimals, and performs post-deployment checks.

Deployment requires Foundry, an Arc Testnet RPC endpoint, and a deployer wallet funded for testnet gas. Keep `DEPLOYER_PRIVATE_KEY` in a local, git-ignored `.env` file. Never paste a seed phrase or private key into chat, Arc Studio, or a repository.

A simulation without `--broadcast` does not deploy anything. Only use `--broadcast` after reviewing the contract, network, deployer, and transaction details yourself. After deployment, verify the contract address and transaction on the Arc Testnet explorer before setting `VITE_AGENTPAY_ADDRESS_TESTNET`.

## Current deployment status

The repository's frontend and contract code are prepared for Arc networks, but this documentation does not assert that AgentPay has been deployed. Add a verified deployment address and transaction reference here only after a real deployment has been completed and checked.

## Third-party code

`lib/forge-std` contains Foundry's standard test library. Its development-only test accounts and keys are not AgentPay credentials and must never hold real funds.
