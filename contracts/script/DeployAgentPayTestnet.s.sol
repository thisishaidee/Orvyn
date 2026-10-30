// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {AgentPay} from "../AgentPay.sol";
import {USDC_ADDRESS} from "../AgentPayConfig.sol";

/// @notice Deploys AgentPay to Arc Testnet (chain ID 5042002).
/// Uses Arc's documented USDC ERC-20 predeploy address, shared by mainnet
/// and testnet; the script verifies code and six-decimal metadata at runtime.
///
/// Required environment variables:
///   DEPLOYER_PRIVATE_KEY — signs the deployment; never logged.
///   DEPLOYER_ADDRESS     — expected public address for that key.
///
/// Without --broadcast this script only simulates; it sends no transaction.
contract DeployAgentPayTestnet is Script {
    uint256 internal constant ARC_TESTNET_CHAIN_ID = 5042002;
    uint8 internal constant USDC_ERC20_DECIMALS = 6;

    error WrongChain(uint256 expected, uint256 actual);
    error DeployerMismatch(address expected, address derived);
    error UsdcNotDeployed(address usdc);
    error UsdcUnexpectedDecimals(uint8 decimals);
    error PostDeployCheckFailed();

    function run() external returns (AgentPay agentPay) {
        if (block.chainid != ARC_TESTNET_CHAIN_ID) {
            revert WrongChain(ARC_TESTNET_CHAIN_ID, block.chainid);
        }

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address expectedDeployer = vm.envAddress("DEPLOYER_ADDRESS");
        address deployer = vm.addr(deployerKey);
        if (deployer != expectedDeployer) revert DeployerMismatch(expectedDeployer, deployer);

        if (USDC_ADDRESS.code.length == 0) revert UsdcNotDeployed(USDC_ADDRESS);
        uint8 usdcDecimals = IERC20Metadata(USDC_ADDRESS).decimals();
        if (usdcDecimals != USDC_ERC20_DECIMALS) revert UsdcUnexpectedDecimals(usdcDecimals);

        console.log("Chain ID:        ", block.chainid);
        console.log("Deployer:        ", deployer);
        console.log("USDC (config):   ", USDC_ADDRESS);

        vm.startBroadcast(deployerKey);
        agentPay = new AgentPay();
        vm.stopBroadcast();

        if (address(agentPay.USDC()) != USDC_ADDRESS || agentPay.nextLeaseId() != 1) {
            revert PostDeployCheckFailed();
        }

        console.log("AgentPay:        ", address(agentPay));
    }
}
