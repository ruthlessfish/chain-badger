"use client";

import { BadgeCard } from "./BadgeCard";
import { useAccount } from "wagmi";
import { useBadges } from "~~/hooks/chainbadger/useBadges";

interface BadgeGridProps {
  onClaimBadge?: (badgeId: bigint) => void;
}

export const BadgeGrid = ({ onClaimBadge }: BadgeGridProps) => {
  const { address } = useAccount();
  const { badges, ownedBadgeIds, loading, refetch } = useBadges();

  const handleClaimSuccess = (badgeId: bigint) => {
    // Refetch badges to update ownership status
    refetch();
    if (onClaimBadge) {
      onClaimBadge(badgeId);
    }
  };

  if (!address) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-lg text-base-content/60 mb-4">Connect your wallet to view available badges</p>
        </div>
      </div>
    );
  }

  if (loading || badges.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-base-content/60">Loading badges from blockchain...</p>
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
          onClaim={handleClaimSuccess}
          showClaimButton={true}
          isOwned={ownedBadgeIds.has(badge.id)}
        />
      ))}
    </div>
  );
};
