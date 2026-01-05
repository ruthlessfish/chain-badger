"use client";

import { useEffect, useState } from "react";
import { BadgeCard } from "./BadgeCard";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { Badge, BadgeRarity } from "~~/types/badge";

interface BadgeGridProps {
  onClaimBadge?: (badgeId: bigint) => void;
}

// Sample badges for initial UI (TODO: Replace with contract reads)
const SAMPLE_BADGES: Badge[] = [
  {
    id: 0n,
    name: "Smart Contract Wizard",
    description: "Completed the Alchemy University Ethereum Bootcamp and mastered Solidity fundamentals",
    image: "https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=SC+Wizard",
    category: "Education",
    rarity: BadgeRarity.Epic,
  },
  {
    id: 1n,
    name: "DeFi Explorer",
    description: "Participated in your first DeFi protocol and learned about decentralized finance",
    image: "https://via.placeholder.com/400x400/10B981/FFFFFF?text=DeFi",
    category: "DeFi",
    rarity: BadgeRarity.Rare,
  },
  {
    id: 2n,
    name: "NFT Collector",
    description: "Minted your first NFT collection and joined the digital art revolution",
    image: "https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=NFT",
    category: "Gaming",
    rarity: BadgeRarity.Uncommon,
  },
  {
    id: 3n,
    name: "Early Adopter",
    description: "One of the first 100 users of ChainBadger - thank you for being an early supporter!",
    image: "https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=Early",
    category: "Community",
    rarity: BadgeRarity.Legendary,
  },
  {
    id: 4n,
    name: "Gas Optimizer",
    description: "Optimized a smart contract to reduce gas costs by over 30%",
    image: "https://via.placeholder.com/400x400/EC4899/FFFFFF?text=Gas",
    category: "Technical",
    rarity: BadgeRarity.Rare,
  },
  {
    id: 5n,
    name: "Community Builder",
    description: "Actively participated in 10+ community events and discussions",
    image: "https://via.placeholder.com/400x400/14B8A6/FFFFFF?text=Community",
    category: "Community",
    rarity: BadgeRarity.Common,
  },
];

export const BadgeGrid = ({ onClaimBadge }: BadgeGridProps) => {
  const { address } = useAccount();
  const [badges] = useState<Badge[]>(SAMPLE_BADGES);
  const [ownedBadgeIds, setOwnedBadgeIds] = useState<Set<bigint>>(new Set());

  // Check which badges the user owns
  useEffect(() => {
    const checkOwnedBadges = async () => {
      if (!address || badges.length === 0) return;

      const ownedSet = new Set<bigint>();

      // Check ownership for each badge
      for (const badge of badges) {
        // TODO: Replace with actual balance check using useScaffoldReadContract
        // For now, simulate that no badges are owned
        const owned = false;
        if (owned) {
          ownedSet.add(badge.id);
        }
      }

      setOwnedBadgeIds(ownedSet);
    };

    checkOwnedBadges();
  }, [address, badges]);

  if (!address) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-lg text-base-content/60 mb-4">Connect your wallet to view available badges</p>
        </div>
      </div>
    );
  }

  if (!badges.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-base-content/60">Loading badges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {badges.map(badge => (
        <BadgeCard
          key={badge.id.toString()}
          badge={badge}
          onClaim={onClaimBadge}
          showClaimButton={true}
          isOwned={ownedBadgeIds.has(badge.id)}
        />
      ))}
    </div>
  );
};
