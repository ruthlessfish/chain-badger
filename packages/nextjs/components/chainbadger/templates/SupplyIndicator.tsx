interface Props {
  /** Current number of claims */
  claimCount: bigint;
  /** Max claims cap (0 = unlimited) */
  maxClaims: bigint;
  className?: string;
}

export function SupplyIndicator({ claimCount, maxClaims, className = "" }: Props) {
  const claimed = Number(claimCount);

  if (maxClaims === 0n) {
    return (
      <span className={`text-sm text-base-content/60 ${className}`}>
        {claimed} claimed · <span className="text-base-content/40">∞ Unlimited</span>
      </span>
    );
  }

  const max = Number(maxClaims);
  const pct = Math.min((claimed / max) * 100, 100);
  const remaining = max - claimed;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex justify-between text-xs text-base-content/60">
        <span>
          {claimed} / {max} claimed
        </span>
        <span>{remaining} left</span>
      </div>
      <progress className="progress progress-primary w-full h-1.5" value={pct} max={100} />
    </div>
  );
}
