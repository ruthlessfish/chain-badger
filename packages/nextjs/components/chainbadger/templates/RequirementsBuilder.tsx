"use client";

import { Requirements } from "~~/types/badge";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface Props {
  value: Requirements;
  onChange: (req: Requirements) => void;
}

export function RequirementsBuilder({ value, onChange }: Props) {
  const hasTokenReq = value.token !== ZERO_ADDRESS || value.minBalance > 0n;
  const hasXpReq = value.minXP > 0n;

  function setField<K extends keyof Requirements>(field: K, fieldValue: Requirements[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  function toggleTokenReq(enabled: boolean) {
    onChange({
      ...value,
      token: enabled ? "" : ZERO_ADDRESS,
      minBalance: enabled ? value.minBalance : 0n,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Token gate ──────────────────────────────────────────── */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3 pb-1">
          <input
            type="checkbox"
            className="checkbox checkbox-primary checkbox-sm"
            checked={hasTokenReq}
            onChange={e => toggleTokenReq(e.target.checked)}
          />
          <span className="label-text font-medium">Token Balance Requirement</span>
        </label>

        {hasTokenReq && (
          <div className="flex flex-col gap-2 pl-7 pt-1">
            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs text-base-content/60">Token contract address (ERC-20)</span>
              </label>
              <input
                type="text"
                className="input input-sm input-bordered font-mono"
                placeholder="0x…"
                value={value.token === ZERO_ADDRESS ? "" : value.token}
                onChange={e => setField("token", e.target.value || ZERO_ADDRESS)}
              />
            </div>
            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs text-base-content/60">
                  Minimum balance (in token&apos;s smallest unit)
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="input input-sm input-bordered"
                placeholder="e.g. 1000000000000000000 (= 1 token at 18 decimals)"
                value={value.minBalance === 0n ? "" : value.minBalance.toString()}
                onChange={e => {
                  try {
                    setField("minBalance", e.target.value ? BigInt(e.target.value) : 0n);
                  } catch {
                    // ignore invalid bigint input
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── XP requirement ─────────────────────────────────────── */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3 pb-1">
          <input
            type="checkbox"
            className="checkbox checkbox-primary checkbox-sm"
            checked={hasXpReq}
            onChange={e => setField("minXP", e.target.checked ? 1n : 0n)}
          />
          <span className="label-text font-medium">XP / Points Requirement</span>
          <span className="badge badge-ghost badge-xs ml-1">Coming Soon</span>
        </label>

        {hasXpReq && (
          <div className="pl-7 pt-1">
            <input
              type="text"
              inputMode="numeric"
              className="input input-sm input-bordered"
              placeholder="Minimum XP required"
              value={value.minXP === 0n ? "" : value.minXP.toString()}
              onChange={e => {
                try {
                  setField("minXP", e.target.value ? BigInt(e.target.value) : 0n);
                } catch {
                  // ignore invalid bigint input
                }
              }}
            />
          </div>
        )}
      </div>

      {/* ── Social follow ──────────────────────────────────────── */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="checkbox checkbox-primary checkbox-sm"
            checked={value.mustFollowCreator}
            onChange={e => setField("mustFollowCreator", e.target.checked)}
          />
          <span className="label-text font-medium">Must Follow Creator</span>
          <span className="badge badge-ghost badge-xs ml-1">Coming Soon</span>
        </label>
      </div>
    </div>
  );
}
