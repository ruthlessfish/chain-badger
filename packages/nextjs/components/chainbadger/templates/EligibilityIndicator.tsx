import { EligibilityCheck } from "~~/types/badge";

interface Props {
  checks: EligibilityCheck[];
  loading?: boolean;
  className?: string;
}

export function EligibilityIndicator({ checks, loading = false, className = "" }: Props) {
  if (loading) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton h-5 w-full rounded" />
        ))}
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-success ${className}`}>
        <span>✓</span>
        <span>No requirements — anyone can claim</span>
      </div>
    );
  }

  return (
    <ul className={`flex flex-col gap-1 ${className}`}>
      {checks.map((check, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className={check.passed ? "text-success" : "text-error"}>{check.passed ? "✓" : "✗"}</span>
          <div className="flex flex-col">
            <span className={check.passed ? "text-base-content" : "text-base-content/80"}>{check.requirement}</span>
            {!check.passed && check.current && (
              <span className="text-xs text-base-content/50">
                You have: {check.current} · Required: {check.required}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
