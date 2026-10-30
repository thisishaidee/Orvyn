# Deploy AgentPay to Arc mainnet

Run everything below on your own machine, from the project root, with your own wallet.
Arc Studio does not deploy to mainnet and never needs your private key. Do not put the key
in this sandbox or in chat.

Legend: FREE = reads or simulates only, spends nothing. REAL GAS = broadcasts a transaction.

Arc Foundry (`arc-forge`, `arc-cast`, `arc-anvil`) is Arc's fork of Foundry that handles
Arc's runtime differences. Install it first:
https://docs.arc.io/arc/tutorials/install-arc-foundry.md

Gas on Arc is USDC (18-decimal native view, 6-decimal ERC-20 view of the same balance).
`maxFeePerGas` must be at least 20 gwei. `.env.example` sets a 30 gwei cap and a 1 gwei tip,
in wei. The cap is a ceiling, not what you pay.

I wrote these commands but did not run them. Flag names come from Foundry; if
`arc-forge script --help` rejects one, use its equivalent.

## 0. Setup (FREE)

```bash
cp .env.example .env
chmod 600 .env
# Edit .env: fill in DEPLOYER_PRIVATE_KEY and DEPLOYER_ADDRESS.
set -a; source .env; set +a
```

`DEPLOYER_PRIVATE_KEY` is the only variable that takes the private key. Never commit `.env`.
`.gitignore` already excludes `.env` and `.env.*` (but keeps `.env.example`).

Before anything else, open `contracts/AgentPayConfig.sol` and confirm the USDC address
against Arc's official contract addresses page: https://docs.arc.io/arc/references/contract-addresses.md
It is a constant and cannot be changed after deployment.

## 1. Build and test (FREE)

```bash
arc-forge build
arc-forge test --match-path 'contracts/test/AgentPay.*t.sol'
```

## 2. Pre-flight read-only checks (FREE)

```bash
arc-cast chain-id --rpc-url "$ARC_MAINNET_RPC_URL"                 # expect 5042
arc-cast gas-price --rpc-url "$ARC_MAINNET_RPC_URL"                # expect >= 20 gwei (20000000000)
arc-cast balance "$DEPLOYER_ADDRESS" --ether --rpc-url "$ARC_MAINNET_RPC_URL"   # deployer's USDC for gas
```

If the gas price is above `ARC_MAX_FEE_WEI`, raise `ARC_MAX_FEE_WEI` in `.env` and re-source it.

## 3. Simulate against mainnet state (FREE)

No `--broadcast`, so nothing is sent. The script also checks the chain ID, that your key
derives `DEPLOYER_ADDRESS`, and that the configured USDC address has code and 6 decimals.

```bash
arc-forge script contracts/script/DeployAgentPay.s.sol:DeployAgentPay \
  --rpc-url "$ARC_MAINNET_RPC_URL" \
  --chain-id 5042 \
  --with-gas-price "$ARC_MAX_FEE_WEI" \
  --priority-gas-price "$ARC_PRIORITY_FEE_WEI"
```

Read the output: "Script ran successfully", the logged deployer and USDC addresses, and the
estimated gas and amount required. Do not add `-vvv` or higher; traces can print cheatcode
return values, which could include your key.

## 4. Optional: rehearse on a local fork of mainnet (FREE)

Terminal 1:

```bash
arc-anvil --fork-url "$ARC_MAINNET_RPC_URL"
```

Terminal 2 (give the deployer fake balance on the fork only; 1 USDC = 1e18 in the native view):

```bash
set -a; source .env; set +a
arc-cast rpc anvil_setBalance "$DEPLOYER_ADDRESS" 0xDE0B6B3A7640000 --rpc-url http://127.0.0.1:8545
arc-forge script contracts/script/DeployAgentPay.s.sol:DeployAgentPay \
  --rpc-url http://127.0.0.1:8545 \
  --chain-id 5042 \
  --with-gas-price "$ARC_MAX_FEE_WEI" \
  --priority-gas-price "$ARC_PRIORITY_FEE_WEI" \
  --broadcast
```

This broadcasts only to your local fork. Stop `arc-anvil` afterward. If the script reports
`WrongChain`, the fork is not reporting chain ID 5042; skip this step.

## 5. REAL DEPLOY (REAL GAS, irreversible)

Only run this after steps 1 to 3 pass and you have reviewed the contract and config.

```bash
arc-forge script contracts/script/DeployAgentPay.s.sol:DeployAgentPay \
  --rpc-url "$ARC_MAINNET_RPC_URL" \
  --chain-id 5042 \
  --with-gas-price "$ARC_MAX_FEE_WEI" \
  --priority-gas-price "$ARC_PRIORITY_FEE_WEI" \
  --broadcast
```

Copy the `AgentPay:` address it prints (also saved in
`broadcast/DeployAgentPay.s.sol/5042/run-latest.json`), then set it in your shell:
`AGENTPAY_ADDRESS`:

```bash
export AGENTPAY_ADDRESS=0x...   # the address the script printed
```

## 6. Post-deploy checks (FREE)

```bash
USDC=$(grep -oE '0x[0-9a-fA-F]{40}' contracts/AgentPayConfig.sol | head -1)
echo "USDC from AgentPayConfig.sol: $USDC"

# Code exists at the address (output should be long hex, not 0x)
arc-cast code "$AGENTPAY_ADDRESS" --rpc-url "$ARC_MAINNET_RPC_URL"

# The contract points at the same USDC as AgentPayConfig.sol (compare ignoring case)
arc-cast call "$AGENTPAY_ADDRESS" "USDC()(address)" --rpc-url "$ARC_MAINNET_RPC_URL"

# Fresh contract: next lease id is 1
arc-cast call "$AGENTPAY_ADDRESS" "nextLeaseId()(uint256)" --rpc-url "$ARC_MAINNET_RPC_URL"

# remainingAllowance on a lease id that does not exist yet: expect 0
arc-cast call "$AGENTPAY_ADDRESS" "remainingAllowance(uint256)(uint256)" 1 --rpc-url "$ARC_MAINNET_RPC_URL"
arc-cast call "$AGENTPAY_ADDRESS" "remainingAllowance(uint256)(uint256)" 999999 --rpc-url "$ARC_MAINNET_RPC_URL"

# The USDC contract is the expected token and AgentPay holds none yet: expect 6 and 0
arc-cast call "$USDC" "decimals()(uint8)" --rpc-url "$ARC_MAINNET_RPC_URL"
arc-cast call "$USDC" "balanceOf(address)(uint256)" "$AGENTPAY_ADDRESS" --rpc-url "$ARC_MAINNET_RPC_URL"
```

## 7. Optional: publish source on the explorer (FREE, no gas)

The constructor takes no arguments. This follows Arc's documented Blockscout pattern for
testnet; confirm the mainnet explorer API path on https://explorer.arc.io if it errors.

```bash
arc-forge verify-contract "$AGENTPAY_ADDRESS" contracts/AgentPay.sol:AgentPay \
  --chain-id 5042 \
  --verifier blockscout \
  --verifier-url https://explorer.arc.io/api/
```

## Before you spend real gas

- Get an independent professional audit. The in-product review is not a substitute.
- Confirm the USDC address in `contracts/AgentPayConfig.sol` against Arc's official list.
- Confirm `DEPLOYER_ADDRESS` is the wallet you intend and holds enough USDC for gas.
- AgentPay has no admin or upgrade path: each lease owner controls their own lease.
