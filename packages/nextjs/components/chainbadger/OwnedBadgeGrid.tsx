"use client";

import { BadgeCard } from "./BadgeCard";
import { useAccount } from "wagmi";
import { useBadges } from "~~/hooks/chainbadger/useBadges";

export const OwnedBadgeGrid = () => {
  const { address } = useAccount();
  const { badges, ownedBadgeIds, loading } = useBadges();

  // Filter to only show owned badges
  const ownedBadges = badges
    .filter(badge => ownedBadgeIds.has(badge.id))
    .map(badge => ({
      ...badge,
      balance: 1n, // TODO: Get actual balance from contract
    }));

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
