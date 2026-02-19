// Badge type definitions for ChainBadger

// ---------------------------------------------------------------------------
// Template System Types
// ---------------------------------------------------------------------------

/**
 * On-chain requirements for a badge template (ABI-encoded as bytes on-chain).
 * Version 1 schema — corresponds to CURRENT_TEMPLATE_VERSION = 1 in BadgeTemplate.sol.
 */
export interface Requirements {
  /** ERC-20 token address that must be held. Zero address = no token gate. */
  token: string;
  /** Minimum token balance (raw, 18-decimal units). 0 = no requirement. */
  minBalance: bigint;
  /** Minimum XP/points (application-specific). 0 = no requirement. */
  minXP: bigint;
  /** Whether the user must follow the template creator (social requirement, checked off-chain). */
  mustFollowCreator: boolean;
}

/**
 * Full template record as returned by BadgeTemplate.getTemplate() and the /api/templates route.
 * The `requirements` field is decoded from the raw on-chain bytes.
 */
export interface BadgeTemplate {
  templateId: bigint;
  badgeId: bigint;
  creator: string;
  metadataURI: string;
  requirements: Requirements;
  /** keccak256 of the raw on-chain requirements bytes */
  requirementsHash: string;
  templateVersion: number;
  maxClaims: bigint;
  claimCount: bigint;
  active: boolean;
  archived: boolean;
  createdAt: bigint;
}

/**
 * Result of evaluating a single requirement for a connected user.
 * Used to render per-requirement pass/fail indicators in the UI.
 */
export interface EligibilityCheck {
  /** Human-readable description of the requirement (e.g. "Hold at least 100 TOKEN") */
  requirement: string;
  passed: boolean;
  /** Current value held by the user (e.g. "50 TOKEN") */
  current?: string;
  /** Required value (e.g. "100 TOKEN") */
  required?: string;
}

/**
 * Derived status of a template used for UI rendering.
 * - claimable: active, not archived, under supply cap
 * - paused: active=false but not archived (creator paused it)
 * - sold-out: supply cap reached
 * - archived: permanently retired
 */
export type TemplateStatus = "claimable" | "paused" | "sold-out" | "archived";

/** Derive the display status of a template from its on-chain fields. */
export function getTemplateStatus(
  template: Pick<BadgeTemplate, "active" | "archived" | "maxClaims" | "claimCount">,
): TemplateStatus {
  if (template.archived) return "archived";
  if (!template.active) return "paused";
  if (template.maxClaims > 0n && template.claimCount >= template.maxClaims) return "sold-out";
  return "claimable";
}

// ---------------------------------------------------------------------------
// Original Badge Types
// ---------------------------------------------------------------------------

export enum BadgeRarity {
  Common = 0,
  Uncommon = 1,
  Rare = 2,
  Epic = 3,
  Legendary = 4,
}

export interface BadgeInfo {
  name: string;
  description: string;
  image: string;
  category: string;
  rarity: BadgeRarity;
}

export interface Badge extends BadgeInfo {
  id: bigint;
  totalMinted?: bigint;
}

export interface OwnedBadge extends Badge {
  balance: bigint;
}

export const RARITY_COLORS: Record<BadgeRarity, { border: string; glow: string; label: string }> = {
  [BadgeRarity.Common]: {
    border: "border-gray-400",
    glow: "shadow-gray-400/20",
    label: "Common",
  },
  [BadgeRarity.Uncommon]: {
    border: "border-green-400",
    glow: "shadow-green-400/20",
    label: "Uncommon",
  },
  [BadgeRarity.Rare]: {
    border: "border-blue-400",
    glow: "shadow-blue-400/20",
    label: "Rare",
  },
  [BadgeRarity.Epic]: {
    border: "border-purple-400",
    glow: "shadow-purple-400/20",
    label: "Epic",
  },
  [BadgeRarity.Legendary]: {
    border: "border-amber-400",
    glow: "shadow-amber-400/20",
    label: "Legendary",
  },
};
