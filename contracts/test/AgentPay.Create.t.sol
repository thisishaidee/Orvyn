// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AgentPayTestBase} from "./AgentPay.Base.t.sol";
import {AgentPay} from "../AgentPay.sol";
import {USDC_ADDRESS} from "../AgentPayConfig.sol";

contract WrongDecimalsToken {
    function decimals() external pure returns (uint8) {
        return 18;
    }
}

contract AgentPayCreateTest is AgentPayTestBase {
    function test_ConstructorAcceptsArcTestnet() public {
        vm.chainId(5042002);
        AgentPay testnetPay = new AgentPay();
        assertEq(address(testnetPay.USDC()), USDC_ADDRESS);
    }

    function test_ConstructorRejectsEthereum() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.UnsupportedChain.selector, 1));
        new AgentPay();
    }

    function test_ConstructorRejectsLocalChain() public {
        vm.chainId(31337);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.UnsupportedChain.selector, 31337));
        new AgentPay();
    }

    function test_ConstructorRejectsMissingUsdcCode() public {
        vm.etch(USDC_ADDRESS, bytes(""));
        vm.expectRevert(abi.encodeWithSelector(AgentPay.UsdcNotDeployed.selector, USDC_ADDRESS));
        new AgentPay();
    }

    function test_ConstructorRejectsWrongUsdcDecimals() public {
        WrongDecimalsToken wrongToken = new WrongDecimalsToken();
        vm.etch(USDC_ADDRESS, address(wrongToken).code);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.UsdcUnexpectedDecimals.selector, 18));
        new AgentPay();
    }

    function test_CreateLeaseWithoutDeposit() public {
        vm.expectEmit(true, true, true, true, address(pay));
        emit AgentPay.LeaseCreated(1, leaseOwner, delegate, CAP, PERIOD, START + LEASE_DURATION, true);
        uint256 id = _createFull(CAP, PERIOD, START + LEASE_DURATION, true, 0);

        assertEq(id, 1);
        assertEq(pay.nextLeaseId(), 2);
        (
            address o,
            address d,
            uint256 cap,
            uint256 period,
            uint256 expiry,
            uint256 windowStart,
            uint256 lastIdx,
            uint256 spent,
            uint256 bal,
            bool allow,
            bool revoked
        ) = pay.leases(id);
        assertEq(o, leaseOwner);
        assertEq(d, delegate);
        assertEq(cap, CAP);
        assertEq(period, PERIOD);
        assertEq(expiry, START + LEASE_DURATION);
        assertEq(windowStart, START);
        assertEq(lastIdx, 0);
        assertEq(spent, 0);
        assertEq(bal, 0);
        assertTrue(allow);
        assertFalse(revoked);
        assertEq(usdc.balanceOf(address(pay)), 0);
        assertEq(usdc.balanceOf(leaseOwner), OWNER_FUNDS);
    }

    function test_CreateLeaseWithDeposit() public {
        vm.expectEmit(true, true, true, true, address(pay));
        emit AgentPay.LeaseCreated(1, leaseOwner, delegate, CAP, PERIOD, START + LEASE_DURATION, false);
        vm.expectEmit(true, true, false, true, address(pay));
        emit AgentPay.Deposited(1, leaseOwner, DEPOSIT);
        uint256 id = _create(DEPOSIT);

        assertEq(_balanceOf(id), DEPOSIT);
        assertEq(usdc.balanceOf(address(pay)), DEPOSIT);
        assertEq(usdc.balanceOf(leaseOwner), OWNER_FUNDS - DEPOSIT);
    }

    function test_CreateLeaseIdsIncrementAndAreIndependent() public {
        uint256 a = _create(10e6);
        uint256 b = _create(20e6);
        assertEq(a, 1);
        assertEq(b, 2);
        assertEq(_balanceOf(a), 10e6);
        assertEq(_balanceOf(b), 20e6);
    }

    function test_CreateLeaseAnyoneCanBeOwner() public {
        vm.prank(other);
        uint256 id = pay.createLease(delegate, CAP, PERIOD, START + 1, false, 0);
        (address o,,,,,,,,,,) = pay.leases(id);
        assertEq(o, other);
    }

    function test_RevertCreate_ZeroDelegate() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InvalidDelegate.selector, address(0)));
        pay.createLease(address(0), CAP, PERIOD, START + 1 days, false, 0);
    }

    function test_RevertCreate_ZeroCap() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InvalidCap.selector, 0));
        pay.createLease(delegate, 0, PERIOD, START + 1 days, false, 0);
    }

    function test_RevertCreate_ZeroPeriod() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InvalidPeriod.selector, 0));
        pay.createLease(delegate, CAP, 0, START + 1 days, false, 0);
    }

    function test_RevertCreate_ExpiryEqualsNow() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InvalidExpiry.selector, START, START));
        pay.createLease(delegate, CAP, PERIOD, START, false, 0);
    }

    function test_RevertCreate_ExpiryInPast() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InvalidExpiry.selector, START - 1, START));
        pay.createLease(delegate, CAP, PERIOD, START - 1, false, 0);
    }

    function test_CreateLease_ExpiryNowPlusOneOk() public {
        uint256 id = _createFull(CAP, PERIOD, START + 1, false, 0);
        assertEq(id, 1);
    }

    function test_RevertCreate_DepositWithoutAllowance() public {
        vm.prank(other);
        vm.expectRevert();
        pay.createLease(delegate, CAP, PERIOD, START + 1 days, false, 1e6);
    }

    function test_RevertCreate_DepositExceedsBalance() public {
        vm.prank(leaseOwner);
        vm.expectRevert();
        pay.createLease(delegate, CAP, PERIOD, START + 1 days, false, OWNER_FUNDS + 1);
    }

    function test_RevertCreate_FailedDepositDoesNotConsumeId() public {
        vm.prank(leaseOwner);
        vm.expectRevert();
        pay.createLease(delegate, CAP, PERIOD, START + 1 days, false, OWNER_FUNDS + 1);
        assertEq(pay.nextLeaseId(), 1);
    }

    // ---------------- deposit top-up ----------------

    function test_DepositTopUp() public {
        uint256 id = _create(100e6);
        vm.expectEmit(true, true, false, true, address(pay));
        emit AgentPay.Deposited(id, leaseOwner, 50e6);
        vm.prank(leaseOwner);
        pay.deposit(id, 50e6);

        assertEq(_balanceOf(id), 150e6);
        assertEq(usdc.balanceOf(address(pay)), 150e6);
        assertEq(usdc.balanceOf(leaseOwner), OWNER_FUNDS - 150e6);
    }

    function test_DepositFundsLeaseCreatedWithoutDeposit() public {
        uint256 id = _create(0);
        assertEq(pay.remainingAllowance(id), 0);
        vm.prank(leaseOwner);
        pay.deposit(id, 30e6);
        assertEq(pay.remainingAllowance(id), 30e6);
        _spend(id, recipient, 30e6);
        assertEq(usdc.balanceOf(recipient), 30e6);
    }

    function test_DepositAllowedAfterRevokeAndExpiryButDoesNotReactivate() public {
        uint256 id = _create(100e6);
        vm.prank(leaseOwner);
        pay.revoke(id);
        vm.prank(leaseOwner);
        pay.deposit(id, 10e6);
        assertEq(_balanceOf(id), 110e6);
        assertEq(pay.remainingAllowance(id), 0);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseRevoked.selector, id));
        _spend(id, recipient, 1);

        uint256 id2 = _create(100e6);
        vm.warp(START + LEASE_DURATION);
        vm.prank(leaseOwner);
        pay.deposit(id2, 10e6);
        assertEq(_balanceOf(id2), 110e6);
        assertEq(pay.remainingAllowance(id2), 0);
    }

    function test_RevertDeposit_NonOwner() public {
        uint256 id = _create(0);
        usdc.mint(other, 10e6);
        vm.startPrank(other);
        usdc.approve(address(pay), 10e6);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotLeaseOwner.selector, id));
        pay.deposit(id, 10e6);
        vm.stopPrank();
    }

    function test_RevertDeposit_ZeroAmount() public {
        uint256 id = _create(0);
        vm.prank(leaseOwner);
        vm.expectRevert(AgentPay.InvalidAmount.selector);
        pay.deposit(id, 0);
    }

    function test_RevertDeposit_UnknownLease() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseNotFound.selector, 99));
        pay.deposit(99, 1);
    }

    // ---------------- allowlist management ----------------

    function test_SetAllowlist_OwnerCanSetAndUnset() public {
        uint256 id = _createFull(CAP, PERIOD, START + LEASE_DURATION, true, 0);
        vm.expectEmit(true, true, false, true, address(pay));
        emit AgentPay.AllowlistUpdated(id, recipient, true);
        vm.prank(leaseOwner);
        pay.setAllowlist(id, recipient, true);
        assertTrue(pay.allowedRecipients(id, recipient));

        vm.expectEmit(true, true, false, true, address(pay));
        emit AgentPay.AllowlistUpdated(id, recipient, false);
        vm.prank(leaseOwner);
        pay.setAllowlist(id, recipient, false);
        assertFalse(pay.allowedRecipients(id, recipient));
    }

    function test_RevertSetAllowlist_NonOwner() public {
        uint256 id = _create(0);
        vm.prank(delegate);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.NotLeaseOwner.selector, id));
        pay.setAllowlist(id, recipient, true);
    }

    function test_RevertSetAllowlist_ZeroRecipient() public {
        uint256 id = _create(0);
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.InvalidRecipient.selector, address(0)));
        pay.setAllowlist(id, address(0), true);
    }

    function test_RevertSetAllowlist_UnknownLease() public {
        vm.prank(leaseOwner);
        vm.expectRevert(abi.encodeWithSelector(AgentPay.LeaseNotFound.selector, 5));
        pay.setAllowlist(5, recipient, true);
    }
}
