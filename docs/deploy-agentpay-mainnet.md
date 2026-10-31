# Deploy AgentPay to Arc Mainnet

This guide uses the Ledger-based deployment script. **Never put a recovery phrase or private key in chat, GitHub, a project agent, or a committed file.** The old `DEPLOYER_PRIVATE_KEY` instructions are obsolete.

## Network and contract configuration

- Arc Mainnet chain ID: `5042`
- RPC: `https://rpc.mainnet.arc.io`
- AgentPay USDC ERC-20: `0x3600000000000000000000000000000000000000`
- USDC ERC-20 decimals: `6`
- Expected deployer: `0xCB2A51B4D34cC6f5dd574F7b5BfA8260E4201C55`

The deployment script checks the chain ID, expected deployer, USDC bytecode and decimals before deployment. It also checks the deployed contract's USDC pointer and initial lease ID.

## 1. Build and test (no transaction)

Run in a trusted environment with the repository checked out at current `main`:

```bash
bun install --frozen-lockfile
forge build
forge test
bun run typecheck
bun test
bun run build
```

GitHub Actions runs these checks on pushes and pull requests to `main`.

## 2. Read-only Arc Mainnet checks (no transaction)

The GitHub Actions workflow `.github/workflows/arc-preflight.yml` checks the Arc RPC chain ID and the configured USDC contract bytecode/decimals. It does not connect a wallet, sign, or broadcast.

## 3. Confirm Ledger support and address (no transaction)

Use Arc Foundry as documented by Arc: https://docs.arc.io/arc/tutorials/install-arc-foundry.md

Before proceeding, confirm that the installed `arc-forge script --help` explicitly lists both `--ledger` and `--sender`. Do not assume ordinary Foundry flags are supported by every Arc Foundry build.

Connect and unlock the Ledger, open its Ethereum app, and derive the public address using the supported Arc Foundry/Cast Ledger command. It must exactly match:

```text
0xCB2A51B4D34cC6f5dd574F7b5BfA8260E4201C55
```

If the address differs, stop. Do not change the script's hardcoded address just to make the command pass. Never enter a recovery phrase into a terminal or website.

Set only the public environment values required by the script:

```bash
export ARC_MAINNET_RPC_URL=https://rpc.mainnet.arc.io
export DEPLOYER_ADDRESS=0xCB2A51B4D34cC6f5dd574F7b5BfA8260E4201C55
```

Do not source an old `.env` file that may contain the previously exposed private key.

## 4. Simulate only (no transaction)

Only after Ledger address verification and after confirming the Arc Foundry help output supports the Ledger flags, run the script **without** `--broadcast`:

```bash
arc-forge script contracts/script/DeployAgentPayMainnet.s.sol:DeployAgentPayMainnet \
  --rpc-url "$ARC_MAINNET_RPC_URL" \
  --chain-id 5042 \
  --ledger \
  --sender "$DEPLOYER_ADDRESS"
```

If Arc Foundry requires additional gas flags, first inspect its help and current Arc fee requirements. Do not add `--broadcast`. Review the simulated deployer, chain, USDC address, gas estimate and resulting contract address.

## 5. Mainnet deployment (real gas; irreversible)

**Do not deploy until the simulation is successful, the estimated cost is reviewed, and the owner explicitly approves the transaction.** Only then may `--broadcast` be added to the verified command and the Ledger transaction reviewed on-device. Never approve a transaction whose network, destination, or value differs from the reviewed simulation.

## 6. Verify after deployment

After an explicitly approved deployment, verify the transaction and contract on https://explorer.arc.io. Read-only checks should confirm that contract bytecode exists, `USDC()` returns the configured USDC address, and `nextLeaseId()` returns `1`.

## Security note

AgentPay has no global administrator or upgrade path. A deployment is permanent. Obtain an independent professional security review before handling real funds; passing project tests is not a security audit.
