// Badge type definitions for ChainBadger

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
