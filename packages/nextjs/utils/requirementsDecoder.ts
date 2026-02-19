/**
 * requirementsDecoder.ts
 *
 * Shared encode/decode utilities for the BadgeTemplate `requirements` field.
 *
 * On-chain, requirements are stored as opaque `bytes` (ABI-encoded). This module
 * encodes/decodes them using the Version 1 schema:
 *
 *   Requirements {
 *     address token;           // ERC-20 address (zeroAddress = no gate)
 *     uint256 minBalance;      // Minimum token balance (raw units)
 *     uint256 minXP;           // Minimum XP/points (app-specific)
 *     bool    mustFollowCreator;
 *   }
 *
 * If the schema ever changes, bump CURRENT_TEMPLATE_VERSION in BadgeTemplate.sol,
 * add a new decoder branch here, and keep the v1 decoder for backward compatibility.
 */
import { decodeAbiParameters, encodeAbiParameters, isAddress, zeroAddress } from "viem";
import type { Requirements } from "~~/types/badge";

// -------------------------------------------------------------------------
// ABI parameter definitions
// -------------------------------------------------------------------------

const REQUIREMENTS_ABI = [
  { name: "token", type: "address" },
  { name: "minBalance", type: "uint256" },
  { name: "minXP", type: "uint256" },
  { name: "mustFollowCreator", type: "bool" },
] as const;

// -------------------------------------------------------------------------
// Default (empty) requirements
// -------------------------------------------------------------------------

/** Zero-value Requirements struct — "no requirements at all". */
export const EMPTY_REQUIREMENTS: Requirements = {
  token: zeroAddress,
  minBalance: 0n,
  minXP: 0n,
  mustFollowCreator: false,
};

// -------------------------------------------------------------------------
// Encode
// -------------------------------------------------------------------------

/**
 * ABI-encode a Requirements struct into the `bytes` format stored on-chain.
 *
 * @param req - Requirements object (use EMPTY_REQUIREMENTS as a starting point)
 * @returns Hex-encoded bytes suitable for passing to BadgeTemplate.createTemplate()
 */
export function encodeRequirements(req: Requirements): `0x${string}` {
  if (!isAddress(req.token)) {
    throw new Error(`Invalid token address: ${req.token}`);
  }

  return encodeAbiParameters(REQUIREMENTS_ABI, [
    req.token as `0x${string}`,
    req.minBalance,
    req.minXP,
    req.mustFollowCreator,
  ]);
}

// -------------------------------------------------------------------------
// Decode
// -------------------------------------------------------------------------

/**
 * Decode the on-chain requirements bytes back into a Requirements struct.
 * Selects the correct decoder based on `templateVersion`.
 *
 * @param data - Raw hex bytes as returned from BadgeTemplate.getTemplate()
 * @param templateVersion - Version stamp on the template (defaults to 1)
 * @returns Decoded Requirements struct
 */
export function decodeRequirements(data: `0x${string}`, templateVersion = 1): Requirements {
  // Guard: empty/zero bytes → no requirements
  if (!data || data === "0x") {
    return { ...EMPTY_REQUIREMENTS };
  }

  switch (templateVersion) {
    case 1:
      return decodeRequirementsV1(data);
    default:
      // Unknown version — fall back to empty rather than throwing, so the UI
      // degrades gracefully rather than crashing on future schema versions.
      console.warn(`[requirementsDecoder] Unknown templateVersion ${templateVersion}, returning empty requirements`);
      return { ...EMPTY_REQUIREMENTS };
  }
}

function decodeRequirementsV1(data: `0x${string}`): Requirements {
  const [token, minBalance, minXP, mustFollowCreator] = decodeAbiParameters(REQUIREMENTS_ABI, data);
  return {
    token: token as string,
    minBalance,
    minXP,
    mustFollowCreator,
  };
}

// -------------------------------------------------------------------------
// Human-readable helpers
// -------------------------------------------------------------------------

/**
 * Return a plain-English summary of a Requirements struct.
 * Used by the UI to generate short requirement labels.
 */
export function describeRequirements(req: Requirements): string[] {
  const lines: string[] = [];

  if (req.token && req.token !== zeroAddress && req.minBalance > 0n) {
    lines.push(`Hold at least ${formatTokenAmount(req.minBalance)} of ${shortenAddress(req.token)}`);
  }

  if (req.minXP > 0n) {
    lines.push(`Minimum ${req.minXP.toString()} XP`);
  }

  if (req.mustFollowCreator) {
    lines.push("Follow the badge creator");
  }

  if (lines.length === 0) {
    lines.push("No requirements — open to everyone");
  }

  return lines;
}

/** Naive 18-decimal formatter (no external dep). Use wagmi's formatUnits for display. */
function formatTokenAmount(raw: bigint): string {
  const whole = raw / 10n ** 18n;
  return whole.toString();
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
