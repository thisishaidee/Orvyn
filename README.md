# Orvynn

Orvynn is a self-custody USDC spending-lease application for AI-agent delegates on Arc. A wallet owner creates a lease with a delegate, a per-period spending cap, an expiry, and an optional recipient allowlist. The delegate can spend only within those rules; the owner can add funds, update recipient permissions, revoke the lease, or withdraw the remaining balance.

The on-chain core is the Orvynn smart contract (named AgentPay in the code), deployed on Arc Mainnet.

Built with [Arc Studio](https://studio.arc.io).

## Networks

- Arc Mainnet — chain ID `5042`
- Arc Testnet — chain ID `5042002`

The frontend supports these two Arc networks only. Ethereum is not a supported Orvynn network.

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

The app can connect external wallets and switch between Arc Mainnet and Arc Testnet. Contract reads and transaction actions require a real Orvynn deployment address for the selected network.

Set these frontend variables only after deploying and independently verifying the contract:

- `VITE_AGENTPAY_ADDRESS_MAINNET`
- `VITE_AGENTPAY_ADDRESS_TESTNET`

The app intentionally does not invent or hardcode deployment addresses.

## Build and test

```bash
bun run typecheck
bun run build
forge build
forge test
bun test
```

## Deployment

Deployment is a real on-chain action and is separate from the frontend deployment.

The Arc Mainnet deployment procedure is maintained in [docs/deploy-agentpay-mainnet.md](docs/deploy-agentpay-mainnet.md). It uses the Arc Foundry Ledger flow, verifies the expected deployer, chain ID, USDC bytecode and decimals, and requires a successful simulation before any broadcast.

Never put a recovery phrase or private key in chat, GitHub, a project agent, or a committed file. Do not broadcast a deployment until the network, deployer, contract configuration, gas estimate, and transaction have been reviewed and explicitly approved.

After deployment, verify the contract address and transaction on the Arc Mainnet explorer before setting `VITE_AGENTPAY_ADDRESS_MAINNET`.

## Verified Arc Mainnet deployment

- Orvynn contract (AgentPay): [`0xA549B60313A86288d46323e5723AAa4c0fAA6363`](https://explorer.arc.io/address/0xA549B60313A86288d46323e5723AAa4c0fAA6363)
- Deployment transaction: [`0x7714b5ae3b3208e80c108a10866b52083d0304391d4d0984cea54928f8021ac7`](https://explorer.arc.io/tx/0x7714b5ae3b3208e80c108a10866b52083d0304391d4d0984cea54928f8021ac7)
- Chain ID: `5042`
- USDC: `0x3600000000000000000000000000000000000000` (6 decimals)

## Agent payment-preparation API

The Cloudflare Pages app exposes:

- `GET /api/agent/health` — health check.
- `POST /api/agent/payment-requests/prepare` — validates a proposed payment against Arc Mainnet lease state and simulates the exact `spend()` call.

The POST endpoint requires the `AGENT_API_TOKEN` Cloudflare Pages secret. It never signs or submits transactions; the delegate must confirm the spend in their wallet. See [agent/AI_AGENT_INTEGRATION.md](agent/AI_AGENT_INTEGRATION.md) for the tool schema and integration instructions.

## Security

Orvynn is self-custody: wallet actions require explicit confirmation by the connected wallet. USDC approval and lease funding are separate transactions. The contract has no global administrator or upgrade path.

Passing automated tests is not an independent security audit. Do not represent the contract as professionally audited unless an independent audit has been completed.
