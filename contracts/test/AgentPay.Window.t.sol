// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AgentPayTestBase} from "./AgentPay.Base.t.sol";
import {AgentPay} from "../AgentPay.sol";

contract AgentPayWindowTest is AgentPayTestBase {
    uint256 internal id;

    function setUp() public override {
        super.setUp();
        id = _create(DEPOSIT);
    }

    function _expectCap() internal {
        vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id));
    }

    function test_Window_ResetsAfterPeriodWithNoInterveningTx() public {
        _spend(id, recipient, CAP);
        _expectCap();
        vm.prank(delegate);
        pay.spend(id, recipient, 1);

        vm.warp(START + PERIOD + 1);
        assertEq(pay.remainingAllowance(id), CAP);
        _spend(id, recipient, CAP);
        assertEq(usdc.balanceOf(recipient), 2 * CAP);
    }

    function test_Window_OneSecondBeforeBoundaryStillSameWindow() public {
        _spend(id, recipient, CAP);
        vm.warp(START + PERIOD - 1);
        assertEq(pay.remainingAllowance(id), 0);
        _expectCap();
        vm.prank(delegate);
        pay.spend(id, recipient, 1);
    }

    function test_Window_ExactBoundaryStartsNewWindow() public {
        _spend(id, recipient, CAP);
        vm.warp(START + PERIOD); // exactly windowStart + periodSeconds
        assertEq(pay.remainingAllowance(id), CAP);
        _spend(id, recipient, CAP);
        assertEq(usdc.balanceOf(recipient), 2 * CAP);
        // and the new window is itself capped
        _expectCap();
        vm.prank(delegate);
        pay.spend(id, recipient, 1);
    }

    function test_Window_MultiWindowSkipGivesFullCapNotAccumulated() public {
        _spend(id, recipient, CAP);
        vm.warp(START + 5 * PERIOD + 123); // skipped windows 1..4
        assertEq(pay.remainingAllowance(id), CAP);
        _spend(id, recipient, CAP);
        // unused allowance from skipped windows does not carry forward
        _expectCap();
        vm.prank(delegate);
        pay.spend(id, recipient, 1);
        assertEq(usdc.balanceOf(recipient), 2 * CAP);
    }

    function test_Window_SkipToExactMultipleBoundary() public {
        _spend(id, recipient, 10e6);
        vm.warp(START + 7 * PERIOD);
        assertEq(pay.remainingAllowance(id), CAP);
        _spend(id, recipient, CAP);
        assertEq(pay.remainingAllowance(id), 0);
        vm.warp(START + 7 * PERIOD + PERIOD - 1);
        assertEq(pay.remainingAllowance(id), 0);
        vm.warp(START + 8 * PERIOD);
        assertEq(pay.remainingAllowance(id), CAP);
    }

    function test_Window_PartialSpendDoesNotCarryOver() public {
        _spend(id, recipient, 10e6);
        vm.warp(START + PERIOD);
        _expectCap();
        vm.prank(delegate);
        pay.spend(id, recipient, CAP + 1);
        _spend(id, recipient, CAP);
    }

    function test_Window_SpendInWindowZeroThenWindowOneThenBackToCumulative() public {
        _spend(id, recipient, 40e6);
        vm.warp(START + PERIOD + 10);
        _spend(id, recipient, 70e6);
        _spend(id, recipient, 30e6);
        _expectCap();
        vm.prank(delegate);
        pay.spend(id, recipient, 1);
        assertEq(usdc.balanceOf(recipient), 140e6);
    }

    function test_Window_AnchoredToCreationNotFirstSpend() public {
        // first spend happens mid-window; the window boundary is still START + PERIOD
        vm.warp(START + PERIOD - 10);
        _spend(id, recipient, CAP);
        vm.warp(START + PERIOD);
        assertEq(pay.remainingAllowance(id), CAP);
        _spend(id, recipient, CAP);
    }

    function test_Window_ResetStillBoundByLeaseBalance() public {
        uint256 id2 = _create(CAP + 20e6);
        _spend(id2, recipient, CAP);
        vm.warp(START + PERIOD);
        assertEq(pay.remainingAllowance(id2), 20e6);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InsufficientLeaseBalance.selector, id2));
        pay.spend(id2, recipient, 20e6 + 1);
        _spend(id2, recipient, 20e6);
    }

    function test_Window_ResetDoesNotBypassRevokeOrExpiry() public {
        _spend(id, recipient, CAP);
        vm.warp(START + PERIOD);
        vm.prank(leaseOwner);
        pay.revoke(id);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseRevoked.selector, id));
        pay.spend(id, recipient, 1);

        uint256 id2 = _createFull(CAP, PERIOD, START + PERIOD + 10, false, DEPOSIT);
        vm.warp(START + 2 * PERIOD);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseExpired.selector, id2));
        pay.spend(id2, recipient, 1);
    }

    function test_Window_CreatedLaterAnchorsToItsOwnStart() public {
        vm.warp(START + 3 days + 7);
        uint256 id2 = _createFull(CAP, PERIOD, START + LEASE_DURATION, false, DEPOSIT);
        _spend(id2, recipient, CAP);
        vm.warp(START + 3 days + 7 + PERIOD - 1);
        assertEq(pay.remainingAllowance(id2), 0);
        vm.warp(START + 3 days + 7 + PERIOD);
        assertEq(pay.remainingAllowance(id2), CAP);
    }

    function test_Window_OneSecondPeriod() public {
        uint256 id2 = _createFull(5e6, 1, START + 1000, false, DEPOSIT);
        _spend(id2, recipient, 5e6);
        vm.warp(START + 1);
        _spend(id2, recipient, 5e6);
        vm.warp(START + 2);
        _spend(id2, recipient, 5e6);
        assertEq(usdc.balanceOf(recipient), 15e6);
    }
}
