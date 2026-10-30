// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Arc mainnet USDC ERC-20 address, taken from the Arc Studio onchain registry.
// REQUIRED BEFORE MAINNET DEPLOYMENT: verify this address against Arc's official
// mainnet documentation and the block explorer, and edit it here if it differs.
// It is baked into AgentPay as a constant and cannot be changed after deployment.
// Amounts use the USDC ERC-20 view (6 decimals), not the 18-decimal native gas view.
address constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000;
