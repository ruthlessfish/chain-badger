"use client";

import { useEffect, useState } from "react";
import { BadgeCard } from "./BadgeCard";
import { useAccount } from "wagmi";
import { Badge, BadgeRarity, OwnedBadge } from "~~/types/badge";

// Sample owned badges for UI (TODO: Replace with contract reads)
const SAMPLE_OWNED_BADGES: OwnedBadge[] = [
  {
    id: 0n,
    name: "Smart Contract Wizard",
    description: "Completed the Alchemy University Ethereum Bootcamp and mastered Solidity fundamentals",
    image: "https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=SC+Wizard",
    category: "Education",
    rarity: BadgeRarity.Epic,
    balance: 1n,
  },
];

export const OwnedBadgeGrid = () => {
  const { address } = useAccount();
  const [ownedBadges, setOwnedBadges] = useState<OwnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwnedBadges = async () => {
      if (!address) {
        setOwnedBadges([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // TODO: Replace with actual contract reads
        // For now, simulate an empty collection (uncomment line below to show sample badge)
        // setOwnedBadges(SAMPLE_OWNED_BADGES);
        setOwnedBadges([]);
      } catch (error) {
        console.error("Error fetching owned badges:", error);
        setOwnedBadges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnedBadges();
  }, [address]);

  if (!address) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-lg text-base-content/60 mb-4">Connect your wallet to view your badges</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-base-content/60">Loading your badges...</p>
        </div>
      </div>
    );
  }

  if (ownedBadges.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-2xl font-bold mb-2">No Badges Yet</h3>
          <p className="text-base-content/60 mb-6">
            You haven't claimed any badges yet. Head to the home page to claim your first achievement!
          </p>
          <a href="/" className="btn btn-primary">
            Explore Badges
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-base-content/70">
          You own <span className="font-semibold text-primary">{ownedBadges.length}</span> badge
          {ownedBadges.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ownedBadges.map(badge => (
          <BadgeCard
            key={badge.id.toString()}
            badge={badge}
            showClaimButton={false}
            isOwned={true}
            balance={badge.balance}
          />
        ))}
      </div>
    </>
  );
};
