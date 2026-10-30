export function Activity() {
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Activity</h1>
      <p className="text-slate-600 text-sm">
        Recent lease creations, spends, revocations, and withdrawals.
      </p>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No activity yet. Activity appears after leases are created on-chain.
      </div>
    </div>
  )
}
