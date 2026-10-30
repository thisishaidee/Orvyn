AgentPay: a USDC spending lease protocol for AI agents on Arc mainnet (chain 5042).

# AgentPay

AgentPay is a Solidity contract for Arc that lets an owner lease a capped, expiring USDC spending allowance to an AI agent. The agent can spend only within its per-period cap, and the owner can revoke or withdraw at any time.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

- Solidity 0.8.28 (Cancun), OpenZeppelin Contracts
- Foundry for build and tests
- Vite + React + TypeScript starter app (no UI for the contract yet)

## Development

Prerequisites: Foundry and bun.

Install:

```
bun install
```

Configure the USDC address in `contracts/AgentPayConfig.sol`. It is set from Arc Studio's registry for Arc mainnet. Verify it against Arc's official documentation before any mainnet deployment, because it cannot be changed after deployment.

Build and test the contracts:

```
forge build
forge test --match-path 'contracts/test/AgentPay.*t.sol'
```

Run the starter app:

```
bun run dev
```

### Environment variables

Only needed to deploy. Copy `.env.example` to `.env` on your own machine and never commit it.

- `DEPLOYER_PRIVATE_KEY`: private key of the wallet that deploys.
- `DEPLOYER_ADDRESS`: public address of that wallet, checked against the key.
- `ARC_MAINNET_RPC_URL`: Arc mainnet RPC endpoint.
- `ARC_MAX_FEE_WEI`, `ARC_PRIORITY_FEE_WEI`: gas settings in wei.

## Mainnet

Mainnet deployment is not performed by Arc Studio. Review, audit, and deploy from your own wallet. Step-by-step commands are in `docs/deploy-agentpay-mainnet.md`.

## Third-party code

`lib/forge-std` is a vendored copy of Foundry's standard test library (MIT or Apache-2.0, see the license files in that folder). Its own test files contain the publicly known default Anvil/Hardhat development account key. That key is for local testing only, is not a secret, is not used by AgentPay, and must never hold real funds. Secret scanners may flag it; that is expected.
