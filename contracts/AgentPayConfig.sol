// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Arc USDC ERC-20 interface address on both Arc Mainnet (5042) and Arc Testnet
// (5042002), independently cross-checked against published Arc network references.
// The ERC-20 interface reports 6 decimals; native USDC used for gas has 18 decimals.
// This address is baked into AgentPay as a constant and cannot be changed after deployment.
address constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000;
