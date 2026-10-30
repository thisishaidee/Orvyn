// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgentPay} from "../AgentPay.sol";
import {USDC_ADDRESS} from "../AgentPayConfig.sol";
import {MockUSDC} from "./MockUSDC.sol";

abstract contract AgentPayTestBase is Test {
    AgentPay internal pay;
    MockUSDC internal usdc;

    address internal leaseOwner = makeAddr("leaseOwner");
    address internal delegate = makeAddr("delegate");
    address internal recipient = makeAddr("recipient");
    address internal other = makeAddr("other");

    uint256 internal constant START = 1_700_000_000;
    uint256 internal constant CAP = 100e6;
    uint256 internal constant PERIOD = 1 days;
    uint256 internal constant LEASE_DURATION = 365 days;
    uint256 internal constant DEPOSIT = 1_000e6;
    uint256 internal constant OWNER_FUNDS = 1_000_000e6;

    function setUp() public virtual {
        vm.warp(START);
        MockUSDC mock = new MockUSDC();
        vm.etch(USDC_ADDRESS, address(mock).code);
        usdc = MockUSDC(USDC_ADDRESS);
        pay = new AgentPay();

        usdc.mint(leaseOwner, OWNER_FUNDS);
        vm.prank(leaseOwner);
        usdc.approve(address(pay), type(uint256).max);
    }

    /// @dev Creates a standard lease (CAP/PERIOD, no allowlist) with `dep` initial deposit.
    function _create(uint256 dep) internal returns (uint256 id) {
        return _createFull(CAP, PERIOD, START + LEASE_DURATION, false, dep);
    }

    function _createFull(uint256 cap, uint256 period, uint256 expiry, bool allowlist, uint256 dep)
        internal
        returns (uint256 id)
    {
        vm.prank(leaseOwner);
        id = pay.createLease(delegate, cap, period, expiry, allowlist, dep);
    }

    function _spend(uint256 id, address to, uint256 amount) internal {
        vm.prank(delegate);
        pay.spend(id, to, amount);
    }

    function _balanceOf(uint256 id) internal view returns (uint256 bal) {
        (,,,,,,,, bal,,) = pay.leases(id);
    }
}
