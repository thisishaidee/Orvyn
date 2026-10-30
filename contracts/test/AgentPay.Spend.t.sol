// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AgentPayTestBase} from "./AgentPay.Base.t.sol";
import {AgentPay} from "../AgentPay.sol";

contract AgentPaySpendTest is AgentPayTestBase {
    uint256 internal id;

    function setUp() public override {
        super.setUp();
        id = _create(DEPOSIT);
    }

    // ---------------- success ----------------

    function test_SpendSuccess_BalancesEventsAllowance() public {
        assertEq(pay.remainingAllowance(id), CAP);

        vm.expectEmit(true, true, false, true, address(pay));
        emit AgentPay.Spent(id, recipient, 40e6);
        _spend(id, recipient, 40e6);

        assertEq(usdc.balanceOf(recipient), 40e6);
        assertEq(usdc.balanceOf(address(pay)), DEPOSIT - 40e6);
        assertEq(_balanceOf(id), DEPOSIT - 40e6);
        assertEq(pay.remainingAllowance(id), CAP - 40e6);
        (,,,,,,, uint256 spent,,,) = pay.leases(id);
        assertEq(spent, 40e6);
    }

    function test_SpendExactCapSucceeds() public {
        _spend(id, recipient, CAP);
        assertEq(usdc.balanceOf(recipient), CAP);
        assertEq(pay.remainingAllowance(id), 0);
    }

    function test_SpendDoesNotAffectOtherLeases() public {
        uint256 id2 = _create(DEPOSIT);
        _spend(id, recipient, 60e6);
        assertEq(pay.remainingAllowance(id2), CAP);
        assertEq(_balanceOf(id2), DEPOSIT);
    }

    // ---------------- cap ----------------

    function test_RevertSpend_OverCap() public {
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id));
        pay.spend(id, recipient, CAP + 1);
        assertEq(usdc.balanceOf(recipient), 0);
    }

    function test_RevertSpend_CumulativeOverCapSameWindow() public {
        _spend(id, recipient, 60e6);
        _spend(id, recipient, 30e6);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id));
        pay.spend(id, recipient, 10e6 + 1);
        // remaining 10e6 still spendable
        _spend(id, recipient, 10e6);
        assertEq(usdc.balanceOf(recipient), CAP);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id));
        pay.spend(id, recipient, 1);
    }

    function test_RevertSpend_CapCheckedBeforeBalance() public {
        // lease with tiny balance and amount over both -> CapExceeded wins
        uint256 id2 = _create(1e6);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id2));
        pay.spend(id2, recipient, CAP + 1);
    }

    // ---------------- revoke ----------------

    function test_RevokeEmitsAndBlocksSpend() public {
        vm.expectEmit(true, false, false, true, address(pay));
        emit AgentPay.Revoked(id);
        vm.prank(leaseOwner);
        pay.revoke(id);

        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseRevoked.selector, id));
        pay.spend(id, recipient, 1e6);
        assertEq(pay.remainingAllowance(id), 0);
    }

    function test_RevokeIsIdempotent() public {
        vm.startPrank(leaseOwner);
        pay.revoke(id);
        pay.revoke(id);
        vm.stopPrank();
        assertEq(pay.remainingAllowance(id), 0);
    }

    function test_RevertRevoke_NonOwner() public {
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotLeaseOwner.selector, id));
        pay.revoke(id);
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotLeaseOwner.selector, id));
        pay.revoke(id);
    }

    function test_RevertRevoke_UnknownLease() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseNotFound.selector, 42));
        pay.revoke(42);
    }

    function test_RevokeDoesNotAffectOtherLeases() public {
        uint256 id2 = _create(DEPOSIT);
        vm.prank(leaseOwner);
        pay.revoke(id);
        _spend(id2, recipient, 1e6);
        assertEq(usdc.balanceOf(recipient), 1e6);
    }

    // ---------------- expiry ----------------

    function test_RevertSpend_AfterExpiry() public {
        vm.warp(START + LEASE_DURATION + 1);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseExpired.selector, id));
        pay.spend(id, recipient, 1e6);
    }

    function test_RevertSpend_ExactlyAtExpiry() public {
        vm.warp(START + LEASE_DURATION);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseExpired.selector, id));
        pay.spend(id, recipient, 1e6);
    }

    function test_SpendOneSecondBeforeExpiry() public {
        vm.warp(START + LEASE_DURATION - 1);
        _spend(id, recipient, 1e6);
        assertEq(usdc.balanceOf(recipient), 1e6);
    }

    // ---------------- delegate / input validation ----------------

    function test_RevertSpend_OnlyDelegate() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotDelegate.selector, id));
        pay.spend(id, recipient, 1e6);
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotDelegate.selector, id));
        pay.spend(id, recipient, 1e6);
    }

    function test_RevertSpend_UnknownLease() public {
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseNotFound.selector, 77));
        pay.spend(77, recipient, 1e6);
    }

    function test_RevertSpend_LeaseIdZero() public {
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseNotFound.selector, 0));
        pay.spend(0, recipient, 1e6);
    }

    function test_RevertSpend_ZeroAmount() public {
        vm.prank(delegate);
        vm.expectRevert(AgentPay.InvalidAmount.selector);
        pay.spend(id, recipient, 0);
    }

    function test_RevertSpend_ZeroRecipient() public {
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InvalidRecipient.selector, address(0)));
        pay.spend(id, address(0), 1e6);
    }

    function test_DelegateOfOneLeaseCannotSpendAnother() public {
        address delegate2 = makeAddr("delegate2");
        vm.prank(leaseOwner);
        uint256 id2 = pay.createLease(delegate2, CAP, PERIOD, START + 1 days, false, DEPOSIT);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotDelegate.selector, id2));
        pay.spend(id2, recipient, 1e6);
        vm.prank(delegate2);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotDelegate.selector, id));
        pay.spend(id, recipient, 1e6);
    }

    // ---------------- allowlist ----------------

    function test_Allowlist_BlocksUnlistedRecipient() public {
        uint256 id2 = _createFull(CAP, PERIOD, START + LEASE_DURATION, true, DEPOSIT);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.RecipientNotAllowed.selector, id2, recipient));
        pay.spend(id2, recipient, 1e6);
    }

    function test_Allowlist_AllowsListedAndBlocksOthers() public {
        uint256 id2 = _createFull(CAP, PERIOD, START + LEASE_DURATION, true, DEPOSIT);
        vm.prank(leaseOwner);
        pay.setAllowlist(id2, recipient, true);
        _spend(id2, recipient, 5e6);
        assertEq(usdc.balanceOf(recipient), 5e6);

        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.RecipientNotAllowed.selector, id2, other));
        pay.spend(id2, other, 1e6);
    }

    function test_Allowlist_RemovalBlocksAgain() public {
        uint256 id2 = _createFull(CAP, PERIOD, START + LEASE_DURATION, true, DEPOSIT);
        vm.startPrank(leaseOwner);
        pay.setAllowlist(id2, recipient, true);
        pay.setAllowlist(id2, recipient, false);
        vm.stopPrank();
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.RecipientNotAllowed.selector, id2, recipient));
        pay.spend(id2, recipient, 1e6);
    }

    function test_Allowlist_DisabledIgnoresList() public {
        // enforcement disabled: any recipient okay, even if flagged false/never set
        _spend(id, other, 1e6);
        assertEq(usdc.balanceOf(other), 1e6);
    }

    function test_Allowlist_ScopedPerLease() public {
        uint256 id2 = _createFull(CAP, PERIOD, START + LEASE_DURATION, true, DEPOSIT);
        uint256 id3 = _createFull(CAP, PERIOD, START + LEASE_DURATION, true, DEPOSIT);
        vm.prank(leaseOwner);
        pay.setAllowlist(id2, recipient, true);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.RecipientNotAllowed.selector, id3, recipient));
        pay.spend(id3, recipient, 1e6);
    }

    // ---------------- insufficient balance ----------------

    function test_RevertSpend_InsufficientLeaseBalance() public {
        uint256 id2 = _create(10e6);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InsufficientLeaseBalance.selector, id2));
        pay.spend(id2, recipient, 10e6 + 1);
    }

    function test_RevertSpend_NoDepositAtAll() public {
        uint256 id2 = _create(0);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InsufficientLeaseBalance.selector, id2));
        pay.spend(id2, recipient, 1);
    }

    function test_InsufficientBalance_DoesNotUseOtherLeaseFunds() public {
        // pay holds DEPOSIT from `id`, but lease id2 has only 5e6
        uint256 id2 = _create(5e6);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InsufficientLeaseBalance.selector, id2));
        pay.spend(id2, recipient, 6e6);
        assertGt(usdc.balanceOf(address(pay)), 6e6);
    }

    function test_SpendDrainsBalanceExactly() public {
        uint256 id2 = _create(CAP);
        _spend(id2, recipient, CAP);
        assertEq(_balanceOf(id2), 0);
    }

    // ---------------- remainingAllowance states ----------------

    function test_Remaining_Nonexistent() public view {
        assertEq(pay.remainingAllowance(0), 0);
        assertEq(pay.remainingAllowance(999), 0);
    }

    function test_Remaining_ActiveCapLimited() public view {
        assertEq(pay.remainingAllowance(id), CAP);
    }

    function test_Remaining_ActiveBalanceLimited() public {
        uint256 id2 = _create(7e6);
        assertEq(pay.remainingAllowance(id2), 7e6);
    }

    function test_Remaining_AfterPartialSpend() public {
        _spend(id, recipient, 25e6);
        assertEq(pay.remainingAllowance(id), 75e6);
    }

    function test_Remaining_ZeroWhenBalanceZero() public {
        uint256 id2 = _create(0);
        assertEq(pay.remainingAllowance(id2), 0);
    }

    function test_Remaining_ZeroAfterRevoke() public {
        vm.prank(leaseOwner);
        pay.revoke(id);
        assertEq(pay.remainingAllowance(id), 0);
    }

    function test_Remaining_ZeroAtAndAfterExpiry() public {
        vm.warp(START + LEASE_DURATION - 1);
        assertEq(pay.remainingAllowance(id), CAP);
        vm.warp(START + LEASE_DURATION);
        assertEq(pay.remainingAllowance(id), 0);
        vm.warp(START + LEASE_DURATION + 100 days);
        assertEq(pay.remainingAllowance(id), 0);
    }

    function test_Remaining_ResetsInNewWindowWithoutTx() public {
        _spend(id, recipient, CAP);
        assertEq(pay.remainingAllowance(id), 0);
        vm.warp(START + PERIOD);
        assertEq(pay.remainingAllowance(id), CAP);
    }

    // ---------------- withdraw ----------------

    function test_Withdraw_RemainingBalanceAndEvent() public {
        _spend(id, recipient, 30e6);
        uint256 ownerBefore = usdc.balanceOf(leaseOwner);

        vm.expectEmit(true, true, false, true, address(pay));
        emit AgentPay.Withdrawn(id, leaseOwner, DEPOSIT - 30e6);
        vm.prank(leaseOwner);
        pay.withdraw(id);

        assertEq(usdc.balanceOf(leaseOwner), ownerBefore + DEPOSIT - 30e6);
        assertEq(usdc.balanceOf(address(pay)), 0);
        assertEq(_balanceOf(id), 0);
        assertEq(pay.remainingAllowance(id), 0);
    }

    function test_Withdraw_NonOwnerReverts() public {
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotLeaseOwner.selector, id));
        pay.withdraw(id);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotLeaseOwner.selector, id));
        pay.withdraw(id);
        assertEq(_balanceOf(id), DEPOSIT);
    }

    function test_Withdraw_AfterRevoke() public {
        vm.prank(leaseOwner);
        pay.revoke(id);
        uint256 before_ = usdc.balanceOf(leaseOwner);
        vm.prank(leaseOwner);
        pay.withdraw(id);
        assertEq(usdc.balanceOf(leaseOwner), before_ + DEPOSIT);
    }

    function test_Withdraw_AfterExpiry() public {
        vm.warp(START + LEASE_DURATION + 1);
        uint256 before_ = usdc.balanceOf(leaseOwner);
        vm.prank(leaseOwner);
        pay.withdraw(id);
        assertEq(usdc.balanceOf(leaseOwner), before_ + DEPOSIT);
    }

    function test_Withdraw_ThenSpendFailsInsufficient() public {
        vm.prank(leaseOwner);
        pay.withdraw(id);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InsufficientLeaseBalance.selector, id));
        pay.spend(id, recipient, 1);
    }

    function test_Withdraw_RevertsWhenEmpty() public {
        vm.startPrank(leaseOwner);
        pay.withdraw(id);
        vm.expectRevert(AgentPay.InvalidAmount.selector);
        pay.withdraw(id);
        vm.stopPrank();
    }

    function test_Withdraw_UnknownLease() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseNotFound.selector, 123));
        pay.withdraw(123);
    }

    function test_Withdraw_OnlyAffectsOwnLease() public {
        uint256 id2 = _create(50e6);
        vm.prank(leaseOwner);
        pay.withdraw(id);
        assertEq(_balanceOf(id2), 50e6);
        assertEq(usdc.balanceOf(address(pay)), 50e6);
    }

    function test_Withdraw_DoesNotResetWindowSpending() public {
        _spend(id, recipient, CAP);
        vm.startPrank(leaseOwner);
        pay.withdraw(id);
        pay.deposit(id, DEPOSIT);
        vm.stopPrank();
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.CapExceeded.selector, id));
        pay.spend(id, recipient, 1);
    }
}
