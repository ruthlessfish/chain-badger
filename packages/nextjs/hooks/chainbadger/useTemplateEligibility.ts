"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { BadgeTemplate, EligibilityCheck } from "~~/types/badge";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ERC20_BALANCE_OF_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC20_SYMBOL_ABI = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC20_DECIMALS_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface TemplateEligibilityResult {
  eligible: boolean;
  checks: EligibilityCheck[];
  loading: boolean;
}

/**
 * Evaluates eligibility requirements for a badge template client-side.
 *
 * - Token balance requirement is verified on-chain via `wagmi` `useReadContract`.
 * - XP requirement is a stub (always passes) — replace when you have an XP source.
 * - Social (mustFollowCreator) is a stub (always passes) — replace with a social API call.
 *
 * @param template  The BadgeTemplate to check. Pass `null` / `undefined` when loading.
 */
export function useTemplateEligibility(template: BadgeTemplate | null | undefined): TemplateEligibilityResult {
  const { address } = useAccount();

  const hasTokenReq =
    !!template && template.requirements.token !== ZERO_ADDRESS && template.requirements.minBalance > 0n;

  // Token balance read
  const { data: tokenBalance, isLoading: balanceLoading } = useReadContract({
    address: hasTokenReq ? (template!.requirements.token as `0x${string}`) : undefined,
    abi: ERC20_BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: address ? [address] : [ZERO_ADDRESS as `0x${string}`],
    query: { enabled: hasTokenReq && !!address },
  });

  // Token symbol for display
  const { data: tokenSymbol } = useReadContract({
    address: hasTokenReq ? (template!.requirements.token as `0x${string}`) : undefined,
    abi: ERC20_SYMBOL_ABI,
    functionName: "symbol",
    query: { enabled: hasTokenReq },
  });

  // Token decimals for display
  const { data: tokenDecimals } = useReadContract({
    address: hasTokenReq ? (template!.requirements.token as `0x${string}`) : undefined,
    abi: ERC20_DECIMALS_ABI,
    functionName: "decimals",
    query: { enabled: hasTokenReq },
  });

  const checks = useMemo<EligibilityCheck[]>(() => {
    if (!template) return [];

    const result: EligibilityCheck[] = [];
    const { requirements } = template;
    const decimals = typeof tokenDecimals === "number" ? tokenDecimals : 18;
    const symbol = (tokenSymbol as string | undefined) ?? "TOKEN";

    // ── Token balance ──────────────────────────────────────────────────────
    if (requirements.token !== ZERO_ADDRESS && requirements.minBalance > 0n) {
      const balance = (tokenBalance as bigint | undefined) ?? 0n;
      const passed = balance >= requirements.minBalance;
      result.push({
        requirement: `Hold at least ${formatUnits(requirements.minBalance, decimals)} ${symbol}`,
        passed,
        current: `${formatUnits(balance, decimals)} ${symbol}`,
        required: `${formatUnits(requirements.minBalance, decimals)} ${symbol}`,
      });
    }

    // ── XP / points ───────────────────────────────────────────────────────
    if (requirements.minXP > 0n) {
      // TODO: integrate with your XP source (replace stub below)
      result.push({
        requirement: `Have at least ${requirements.minXP.toString()} XP`,
        passed: true, // stub — always passes until XP source exists
        current: "XP check not yet implemented",
        required: requirements.minXP.toString(),
      });
    }

    // ── Social: follow creator ─────────────────────────────────────────────
    if (requirements.mustFollowCreator) {
      // TODO: replace with a real social API call
      result.push({
        requirement: "Follow the badge creator",
        passed: true, // stub — always passes until social integration exists
      });
    }

    return result;
  }, [template, tokenBalance, tokenSymbol, tokenDecimals]);

  const eligible = checks.length === 0 || checks.every(c => c.passed);
  const loading = balanceLoading;

  return { eligible, checks, loading };
}
