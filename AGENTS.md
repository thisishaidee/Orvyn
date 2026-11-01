# Orvynn

Project guidance for Orvynn, a self-custody USDC spending-lease application for AI-agent delegates on Arc. The on-chain contract is named AgentPay.

## Product

An owner creates a lease for a delegate wallet with a USDC spending cap per period, a period length, an expiry, and an optional recipient allowlist. The delegate can spend only within those limits. The owner can add funds, update recipient permissions, revoke, and withdraw. There is no global administrator or upgrade path.

All contract amounts are raw USDC ERC-20 units with 6 decimals. Native Arc gas balances are separate and use a different denomination.

## Networks

- Arc Mainnet: chain ID `5042`
- Arc Testnet: chain ID `5042002`
- USDC ERC-20 configured address: `0x3600000000000000000000000000000000000000`
- USDC ERC-20 decimals: `6`

The frontend supports Arc Mainnet and Arc Testnet only. Do not add Ethereum as an Orvynn network.

## Architecture

- Contracts: Solidity, OpenZeppelin, Foundry.
- Frontend: React, Vite, TypeScript, Tailwind CSS, wagmi, viem, TanStack Query.
- Wallet actions are submitted through the connected wallet and require explicit wallet confirmation.
- USDC approval and AgentPay funding are separate transactions. Never silently chain an approval and a deposit.
- Contract reads require a configured deployment address for the selected network. Do not invent or hardcode deployment addresses.

## Key files

- `contracts/AgentPay.sol`: lease contract.
- `contracts/AgentPayConfig.sol`: USDC ERC-20 address.
- `contracts/test/`: Foundry tests.
- `contracts/script/DeployAgentPayTestnet.s.sol`: Arc Testnet deployment script.
- `contracts/script/DeployAgentPayMainnet.s.sol`: Arc Mainnet deployment script.
- `src/config.ts`: supported Arc chains and wallet configuration.
- `src/lib/agentpay-abi.ts` and `src/lib/agentpay-write-abi.ts`: contract ABIs.
- `src/lib/agentpay-reads.ts`: lease and activity reads.
- `src/lib/agentpay-transactions.ts`: wallet-confirmed contract transactions.
- `src/components/agentpay/`: lease management and delegate spending UI.
- `src/pages/`: application pages.

## Development

```bash
bun install
bun run dev
bun run typecheck
bun run build
forge build
forge test
bun test
```

## Deployment and security rules

- Do not claim that Orvynn is deployed unless the address and transaction are verified on the correct Arc explorer.
- The verified Arc Mainnet AgentPay deployment is `0xA549B60313A86288d46323e5723AAa4c0fAA6363`, created by transaction `0x7714b5ae3b3208e80c108a10866b52083d0304391d4d0984cea54928f8021ac7` on chain ID `5042`.
- Follow `docs/deploy-agentpay-mainnet.md` for the Ledger-based Arc Foundry deployment process. Do not use obsolete private-key deployment instructions.
- Never request, display, commit, or transmit private keys, seed phrases, recovery phrases, or `.env` contents.
- Never broadcast a deployment or submit a wallet transaction without the user's explicit instruction and a final network/transaction review.
- A Foundry simulation without `--broadcast` is not a deployment.
- After a verified deployment, configure the matching frontend variable: `VITE_AGENTPAY_ADDRESS_TESTNET` or `VITE_AGENTPAY_ADDRESS_MAINNET`.
- Do not merge an open pull request without the user's explicit approval.
