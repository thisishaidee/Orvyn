// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AgentPayTestBase} from "./AgentPay.Base.t.sol";
import {AgentPay} from "../AgentPay.sol";
import {MockUSDC} from "./MockUSDC.sol";

/// Drives bounded random actions across a few leases.
contract AgentPayHandler is Test {
    AgentPay public pay;
    MockUSDC public usdc;
    address public leaseOwner;
    address public delegate;
    address public recipient;
    uint256 public constant N = 3;
    uint256 public constant CAP = 100e6;
    uint256 public constant PERIOD = 1 days;

    uint256 public ghostDeposited;
    uint256 public ghostOutflow; // spent + withdrawn
    // ghost: amount spent per lease per window index (since creation)
    mapping(uint256 => mapping(uint256 => uint256)) public spentIn;
    uint256 public maxWindowSpend;
    uint256 public startTs;
    bool public violation; // spend outcome disagreed with remainingAllowance

    constructor(AgentPay _pay, MockUSDC _usdc, address _owner, address _delegate, address _recipient) {
        pay = _pay;
        usdc = _usdc;
        leaseOwner = _owner;
        delegate = _delegate;
        recipient = _recipient;
        startTs = block.timestamp;
        usdc.mint(_owner, 1e15);
        vm.startPrank(_owner);
        usdc.approve(address(_pay), type(uint256).max);
        for (uint256 i = 0; i < N; i++) {
            pay.createLease(_delegate, CAP, PERIOD, block.timestamp + 3650 days, false, 0);
        }
        vm.stopPrank();
    }

    function _id(uint256 seed) internal pure returns (uint256) {
        return (seed % N) + 1;
    }

    function deposit(uint256 seed, uint256 amount) external {
        amount = bound(amount, 1, 500e6);
        vm.prank(leaseOwner);
        pay.deposit(_id(seed), amount);
        ghostDeposited += amount;
    }

    function spend(uint256 seed, uint256 amount) external {
        uint256 id = _id(seed);
        amount = bound(amount, 1, 150e6);
        uint256 rem = pay.remainingAllowance(id);
        vm.prank(delegate);
        try pay.spend(id, recipient, amount) {
            // must only succeed within remainingAllowance
            if (amount > rem) violation = true;
            ghostOutflow += amount;
            uint256 w = (block.timestamp - startTs) / PERIOD;
            spentIn[id][w] += amount;
            if (spentIn[id][w] > maxWindowSpend) maxWindowSpend = spentIn[id][w];
        } catch {
            if (amount <= rem) violation = true;
        }
    }

    function withdraw(uint256 seed) external {
        uint256 id = _id(seed);
        (,,,,,,,, uint256 bal,,) = pay.leases(id);
        if (bal == 0) return;
        vm.prank(leaseOwner);
        pay.withdraw(id);
        ghostOutflow += bal;
    }

    function warp(uint256 secs) external {
        secs = bound(secs, 0, 3 days);
        vm.warp(block.timestamp + secs);
    }

    function sumBalances() external view returns (uint256 total) {
        for (uint256 i = 1; i <= N; i++) {
            (,,,,,,,, uint256 bal,,) = pay.leases(i);
            total += bal;
        }
    }
}

contract AgentPayInvariantTest is AgentPayTestBase {
    AgentPayHandler internal handler;

    function setUp() public override {
        super.setUp();
        address h = makeAddr("recipientInv");
        handler = new AgentPayHandler(pay, usdc, makeAddr("invOwner"), makeAddr("invDelegate"), h);
        targetContract(address(handler));
    }

    /// Conservation: contract token balance == sum of lease balances == deposits - outflows.
    function invariant_TokenBalanceEqualsSumOfLeaseBalances() public view {
        assertEq(usdc.balanceOf(address(pay)), handler.sumBalances());
        assertEq(handler.ghostDeposited() - handler.ghostOutflow(), handler.sumBalances());
    }

    /// spend succeeds iff amount <= remainingAllowance (view and spend agree).
    function invariant_SpendAgreesWithRemainingAllowance() public view {
        assertFalse(handler.violation());
    }

    /// No lease ever spends more than cap within a single window.
    function invariant_NeverExceedsCapPerWindow() public view {
        assertLe(handler.maxWindowSpend(), handler.CAP());
    }
}
