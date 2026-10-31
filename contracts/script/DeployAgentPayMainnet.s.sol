// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {AgentPay} from "../AgentPay.sol";
import {USDC_ADDRESS} from "../AgentPayConfig.sol";

/// @notice Deploys AgentPay to Arc Mainnet (chain ID 5042).
/// Verifies the chain, deployer identity, USDC bytecode and six-decimal metadata
/// before broadcasting, then checks the deployed contract configuration.
///
/// Required local environment variables:
///   DEPLOYER_ADDRESS — must equal the hardcoded DEPLOYER constant.
///   Signing happens on the connected Ledger (--ledger --sender); no private
///   key is read by this script.
///
/// Without --broadcast this script only simulates; it sends no transaction.
contract DeployAgentPayMainnet is Script {
    uint256 internal constant ARC_MAINNET_CHAIN_ID = 5042;
    uint8 internal constant USDC_ERC20_DECIMALS = 6;
    address internal constant DEPLOYER = 0xCB2A51B4D34cC6f5dd574F7b5BfA8260E4201C55;

    error WrongChain(uint256 expected, uint256 actual);
    error DeployerMismatch(address expected, address derived);
    error UsdcNotDeployed(address usdc);
    error UsdcUnexpectedDecimals(uint8 decimals);
    error PostDeployCheckFailed();

    function run() external returns (AgentPay agentPay) {
        if (block.chainid != ARC_MAINNET_CHAIN_ID) {
            revert WrongChain(ARC_MAINNET_CHAIN_ID, block.chainid);
        }

        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        if (deployer != DEPLOYER) {
            revert DeployerMismatch(DEPLOYER, deployer);
        }

        if (USDC_ADDRESS.code.length == 0) revert UsdcNotDeployed(USDC_ADDRESS);
        uint8 usdcDecimals = IERC20Metadata(USDC_ADDRESS).decimals();
        if (usdcDecimals != USDC_ERC20_DECIMALS) {
            revert UsdcUnexpectedDecimals(usdcDecimals);
        }

        console.log("Chain ID:        ", block.chainid);
        console.log("Deployer:        ", deployer);
        console.log("USDC (config):   ", USDC_ADDRESS);

        vm.startBroadcast(deployer);
        agentPay = new AgentPay();
        vm.stopBroadcast();

        if (address(agentPay.USDC()) != USDC_ADDRESS || agentPay.nextLeaseId() != 1) {
            revert PostDeployCheckFailed();
        }

        console.log("AgentPay:        ", address(agentPay));
    }
}
