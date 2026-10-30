// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AgentPayTestBase} from "./AgentPay.Base.t.sol";
import {AgentPay} from "../AgentPay.sol";

contract AgentPayFuzzTest is AgentPayTestBase {
    /// Spending <= cap succeeds, exactly cap-sum then any extra reverts; balances conserved.
    function testFuzz_CapArithmeticWithinWindow(uint256 cap, uint256 a, uint256 b) public {
        cap = bound(cap, 1, 1e12);
        a = bound(a, 1, cap);
        uint256 id = _createFull(cap, PERIOD, START + LEASE_DURATION, false, OWNER_FUNDS);

        _spend(id, recipient, a);
        assertEq(pay.remainingAllowance(id), cap - a);

        b = bound(b, 1, cap);
        vm.prank(delegate);
        if (b > cap - a) {
            vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id));
            pay.spend(id, recipient, b);
            assertEq(usdc.balanceOf(recipient), a);
        } else {
            pay.spend(id, recipient, b);
            assertEq(usdc.balanceOf(recipient), a + b);
            assertEq(pay.remainingAllowance(id), cap - a - b);
        }
        assertEq(usdc.balanceOf(address(pay)), OWNER_FUNDS - usdc.balanceOf(recipient));
    }

    /// Window index = (t - start)/period: same index => cumulative, new index => fresh cap.
    function testFuzz_WindowReset(uint256 period, uint256 dt, uint256 first) public {
        period = bound(period, 1, 365 days);
        uint256 expiry = START + 1000 * 365 days;
        dt = bound(dt, 0, 100 * 365 days);
        uint256 id = _createFull(CAP, period, expiry, false, DEPOSIT);
        first = bound(first, 1, CAP);
        _spend(id, recipient, first);

        vm.warp(START + dt);
        bool sameWindow = (dt / period) == 0;
        uint256 expected = sameWindow ? CAP - first : CAP;
        assertEq(pay.remainingAllowance(id), expected);

        vm.prank(delegate);
        if (sameWindow) {
            vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id));
            pay.spend(id, recipient, expected + 1);
        } else {
            vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id));
            pay.spend(id, recipient, CAP + 1);
        }
        if (expected > 0) _spend(id, recipient, expected);
        assertEq(pay.remainingAllowance(id), 0);
    }

    /// Remaining allowance is always min(cap-spent, balance) and never exceeds either.
    function testFuzz_RemainingIsMinOfCapAndBalance(uint256 cap, uint256 dep, uint256 amt) public {
        cap = bound(cap, 1, 1e12);
        dep = bound(dep, 0, 1e12);
        uint256 id = _createFull(cap, PERIOD, START + LEASE_DURATION, false, dep);
        uint256 expected = cap < dep ? cap : dep;
        assertEq(pay.remainingAllowance(id), expected);

        if (expected == 0) return;
        amt = bound(amt, 1, expected);
        _spend(id, recipient, amt);
        uint256 balAfter = dep - amt;
        uint256 capAfter = cap - amt;
        assertEq(pay.remainingAllowance(id), capAfter < balAfter ? capAfter : balAfter);
    }

    /// Spending more than the balance (but within cap) reverts with InsufficientLeaseBalance.
    function testFuzz_InsufficientBalance(uint256 dep, uint256 amt) public {
        dep = bound(dep, 0, CAP - 1);
        amt = bound(amt, dep + 1, CAP);
        uint256 id = _create(dep);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InsufficientLeaseBalance.selector, id));
        pay.spend(id, recipient, amt);
    }

    /// Deposit then withdraw round-trips exactly.
    function testFuzz_DepositWithdrawRoundTrip(uint256 initial, uint256 topUp) public {
        initial = bound(initial, 0, 5e11);
        topUp = bound(topUp, 1, 5e11);
        uint256 id = _create(initial);
        vm.startPrank(leaseOwner);
        pay.deposit(id, topUp);
        pay.withdraw(id);
        vm.stopPrank();
        assertEq(usdc.balanceOf(leaseOwner), OWNER_FUNDS);
        assertEq(usdc.balanceOf(address(pay)), 0);
    }

    /// Expiry is exclusive: spend succeeds iff now < expiry.
    function testFuzz_ExpiryBoundary(uint256 duration, uint256 dt) public {
        duration = bound(duration, 1, 30 days);
        dt = bound(dt, 0, 60 days);
        uint256 id = _createFull(CAP, 1000 days, START + duration, false, DEPOSIT);
        vm.warp(START + dt);
        if (dt >= duration) {
            assertEq(pay.remainingAllowance(id), 0);
            vm.prank(delegate);
            vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseExpired.selector, id));
            pay.spend(id, recipient, 1);
        } else {
            assertEq(pay.remainingAllowance(id), CAP);
            _spend(id, recipient, 1);
        }
    }
}
