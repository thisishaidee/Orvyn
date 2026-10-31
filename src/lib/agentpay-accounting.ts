/**
 * Pure helpers that mirror contracts/AgentPay.sol.
 * Period rollover matches remainingAllowance:
 *   windowIndex = (block.timestamp - windowStart) / periodSeconds
 *   spent = windowIndex == lastWindowIndex ? spentThisWindow : 0
 */

import type { Address } from 'viem'

/** Same integer division the contract uses. Reverts-equivalent if now is before windowStart. */
export function currentWindowIndex(nowSeconds: bigint, windowStart: bigint, periodSeconds: bigint): bigint {
  if (periodSeconds === 0n) {
    throw new Error('periodSeconds is zero; the contract rejects this lease')
  }
  if (nowSeconds < windowStart) {
    throw new Error('timestamp is before windowStart; the contract formula would underflow')
  }
  return (nowSeconds - windowStart) / periodSeconds
}

/**
 * Current-period spending. Reports the stored spentThisWindow only when the
 * stored lastWindowIndex equals the current window index. Otherwise zero.
 */
export function currentPeriodSpent(input: {
  nowSeconds: bigint
  windowStart: bigint
  periodSeconds: bigint
  lastWindowIndex: bigint
  spentThisWindow: bigint
}): bigint {
  const windowIndex = currentWindowIndex(input.nowSeconds, input.windowStart, input.periodSeconds)
  return windowIndex === input.lastWindowIndex ? input.spentThisWindow : 0n
}

/**
 * Agent shown for an activity row.
 * LeaseCreated uses the event delegate. Other events use the lease delegate.
 * The owner is never substituted for the agent.
 */
export function activityAgent(
  eventName: string,
  args: { delegate?: Address },
  leaseDelegate?: Address,
): Address | undefined {
  if (eventName === 'LeaseCreated' && args.delegate) return args.delegate
  return leaseDelegate
}
