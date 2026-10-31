// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {USDC_ADDRESS} from "./AgentPayConfig.sol";

/// @title AgentPay
/// @notice Multi-tenant USDC spending leases for AI-agent delegates on Arc.
/// @dev All amounts are raw 6-decimal USDC units (1 USDC = 1_000_000).
/// Uses only the USDC ERC-20 interface, not native gas balances. No payable
/// entry points, receive, or fallback are provided. Each lease has its own owner;
/// there is no global administrator. Direct token transfers do not fund a lease.
contract AgentPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public constant USDC = IERC20(USDC_ADDRESS);

    struct Lease {
        address owner;
        address delegate;
        uint256 cap;
        uint256 periodSeconds;
        uint256 expiry;
        uint256 windowStart;
        uint256 lastWindowIndex;
        uint256 spentThisWindow;
        uint256 balance;
        bool allowlistEnabled;
        bool revoked;
    }

    /// @notice The next lease identifier; valid identifiers begin at 1.
    uint256 public nextLeaseId = 1;

    /// @notice Lease records; spentThisWindow applies only to lastWindowIndex.
    /// @dev Use remainingAllowance for a rollover-aware spendable amount.
    mapping(uint256 => Lease) public leases;

    /// @notice Per-lease recipient permissions, enforced only when enabled.
    mapping(uint256 => mapping(address => bool)) public allowedRecipients;

    error UnsupportedChain(uint256 actualChainId);
    error UsdcNotDeployed(address token);
    error UsdcMetadataCallFailed(address token);
    error UsdcUnexpectedDecimals(uint256 actualDecimals);
    error LeaseNotFound(uint256 leaseId);
    error NotLeaseOwner(uint256 leaseId);
    error NotDelegate(uint256 leaseId);
    error InvalidDelegate(address delegate);
    error InvalidRecipient(address recipient);
    error InvalidCap(uint256 cap);
    error InvalidPeriod(uint256 periodSeconds);
    error InvalidExpiry(uint256 expiry, uint256 currentTimestamp);
    error InvalidAmount();
    error LeaseExpired(uint256 leaseId);
    error LeaseRevoked(uint256 leaseId);
    error RecipientNotAllowed(uint256 leaseId, address recipient);
    error CapExceeded(uint256 leaseId);
    error InsufficientLeaseBalance(uint256 leaseId);

    event LeaseCreated(
        uint256 indexed leaseId,
        address indexed owner,
        address indexed delegate,
        uint256 cap,
        uint256 periodSeconds,
        uint256 expiry,
        bool allowlistEnabled
    );
    event Spent(uint256 indexed leaseId, address indexed recipient, uint256 amount);
    event Revoked(uint256 indexed leaseId);
    event Withdrawn(uint256 indexed leaseId, address indexed owner, uint256 amount);
    event Deposited(uint256 indexed leaseId, address indexed owner, uint256 amount);
    event AllowlistUpdated(uint256 indexed leaseId, address indexed recipient, bool allowed);

    /// @dev AgentPay is only deployable on Arc Mainnet and Arc Testnet. Validate
    /// the configured ERC-20 before storing it as the protocol token.
    constructor() {
        if (block.chainid != 5042 && block.chainid != 5042002) {
            revert UnsupportedChain(block.chainid);
        }
        if (USDC_ADDRESS.code.length == 0) revert UsdcNotDeployed(USDC_ADDRESS);

        (bool success, bytes memory result) = USDC_ADDRESS.staticcall(
            abi.encodeCall(IERC20Metadata.decimals, ())
        );
        if (!success || result.length < 32) revert UsdcMetadataCallFailed(USDC_ADDRESS);

        uint256 actualDecimals = abi.decode(result, (uint256));
        if (actualDecimals != 6) revert UsdcUnexpectedDecimals(actualDecimals);
    }

    /// @notice Create a lease owned by the caller, optionally funding it atomically.
    /// @dev Approve this contract for initialDeposit first. The first period starts
    /// now; unused allowance does not carry forward. An enabled allowlist starts empty.
    /// @param delegate The only address authorized to spend this lease.
    /// @param cap Maximum USDC units spendable in each fixed period.
    /// @param periodSeconds Length of each period in seconds; must be nonzero.
    /// @param expiry Exclusive expiry timestamp, strictly later than now.
    /// @param allowlistEnabled Whether recipient permissions are enforced (immutable).
    /// @param initialDeposit USDC units to pull from the caller; may be zero.
    /// @return leaseId Newly allocated lease identifier.
    function createLease(
        address delegate,
        uint256 cap,
        uint256 periodSeconds,
        uint256 expiry,
        bool allowlistEnabled,
        uint256 initialDeposit
    ) external nonReentrant returns (uint256 leaseId) {
        if (delegate == address(0)) revert InvalidDelegate(delegate);
        if (cap == 0) revert InvalidCap(cap);
        if (periodSeconds == 0) revert InvalidPeriod(periodSeconds);
        if (expiry <= block.timestamp) revert InvalidExpiry(expiry, block.timestamp);

        leaseId = nextLeaseId++;
        Lease storage lease = leases[leaseId];
        lease.owner = msg.sender;
        lease.delegate = delegate;
        lease.cap = cap;
        lease.periodSeconds = periodSeconds;
        lease.expiry = expiry;
        lease.windowStart = block.timestamp;
        lease.allowlistEnabled = allowlistEnabled;
        lease.balance = initialDeposit;

        emit LeaseCreated(leaseId, msg.sender, delegate, cap, periodSeconds, expiry, allowlistEnabled);
        if (initialDeposit != 0) {
            USDC.safeTransferFrom(msg.sender, address(this), initialDeposit);
            emit Deposited(leaseId, msg.sender, initialDeposit);
        }
    }

    /// @notice Spend lease funds as its delegate, subject to the current period cap.
    /// @dev Period index is (now - windowStart) / periodSeconds. A new index
    /// logically resets spending without requiring any rollover transaction.
    function spend(uint256 leaseId, address recipient, uint256 amount) external nonReentrant {
        Lease storage lease = _existingLease(leaseId);
        if (msg.sender != lease.delegate) revert NotDelegate(leaseId);
        if (lease.revoked) revert LeaseRevoked(leaseId);
        if (block.timestamp >= lease.expiry) revert LeaseExpired(leaseId);
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidRecipient(recipient);
        if (lease.allowlistEnabled && !allowedRecipients[leaseId][recipient]) {
            revert RecipientNotAllowed(leaseId, recipient);
        }

        uint256 windowIndex = (block.timestamp - lease.windowStart) / lease.periodSeconds;
        uint256 spent = windowIndex == lease.lastWindowIndex ? lease.spentThisWindow : 0;
        if (amount > lease.cap - spent) revert CapExceeded(leaseId);
        if (amount > lease.balance) revert InsufficientLeaseBalance(leaseId);

        lease.lastWindowIndex = windowIndex;
        lease.spentThisWindow = spent + amount;
        lease.balance -= amount;
        emit Spent(leaseId, recipient, amount);
        USDC.safeTransfer(recipient, amount);
    }

    /// @notice Permanently block further spending; does not automatically withdraw.
    /// @dev Only the lease owner may revoke. Repeated revocation is idempotent.
    function revoke(uint256 leaseId) external nonReentrant {
        Lease storage lease = _ownedLease(leaseId);
        lease.revoked = true;
        emit Revoked(leaseId);
    }

    /// @notice Withdraw all remaining lease funds to its owner at any time.
    /// @dev Works while active, expired, or revoked. Does not reset period spending.
    function withdraw(uint256 leaseId) external nonReentrant {
        Lease storage lease = _ownedLease(leaseId);
        uint256 amount = lease.balance;
        if (amount == 0) revert InvalidAmount();
        lease.balance = 0;
        emit Withdrawn(leaseId, lease.owner, amount);
        USDC.safeTransfer(lease.owner, amount);
    }

    /// @notice Top up a lease from its owner's approved USDC balance.
    /// @dev Allowed even after expiry or revocation; funding never reactivates a
    /// lease or resets its period spending. The amount must be nonzero.
    function deposit(uint256 leaseId, uint256 amount) external nonReentrant {
        Lease storage lease = _ownedLease(leaseId);
        if (amount == 0) revert InvalidAmount();
        lease.balance += amount;
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(leaseId, msg.sender, amount);
    }

    /// @notice Set a recipient permission as the lease owner.
    /// @dev Does not change the fixed allowlistEnabled setting. Permissions on
    /// leases with enforcement disabled are recorded but have no spending effect.
    function setAllowlist(uint256 leaseId, address recipient, bool allowed) external nonReentrant {
        _ownedLease(leaseId);
        if (recipient == address(0)) revert InvalidRecipient(recipient);
        allowedRecipients[leaseId][recipient] = allowed;
        emit AllowlistUpdated(leaseId, recipient, allowed);
    }

    /// @notice Return min(unused current-period cap, lease balance).
    /// @dev Returns zero for nonexistent, revoked, or expired leases. Period
    /// rollover is computed on read, with no state update or transaction needed.
    function remainingAllowance(uint256 leaseId) external view returns (uint256) {
        Lease storage lease = leases[leaseId];
        if (lease.owner == address(0) || lease.revoked || block.timestamp >= lease.expiry) {
            return 0;
        }
        uint256 windowIndex = (block.timestamp - lease.windowStart) / lease.periodSeconds;
        uint256 spent = windowIndex == lease.lastWindowIndex ? lease.spentThisWindow : 0;
        uint256 remaining = lease.cap - spent;
        return remaining < lease.balance ? remaining : lease.balance;
    }

    function _existingLease(uint256 leaseId) private view returns (Lease storage lease) {
        lease = leases[leaseId];
        if (lease.owner == address(0)) revert LeaseNotFound(leaseId);
    }

    function _ownedLease(uint256 leaseId) private view returns (Lease storage lease) {
        lease = _existingLease(leaseId);
        if (msg.sender != lease.owner) revert NotLeaseOwner(leaseId);
    }
}
