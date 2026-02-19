"use client";

import { useAccount } from "wagmi";

/**
 * OwnedBadgeGrid — placeholder until Phase 4 rewrites this component
 * to use TemplateCard and template-based badge ownership.
 */
export const OwnedBadgeGrid = () => {
  const { address } = useAccount();

  if (!address) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-lg text-base-content/60 mb-4">Connect your wallet to view your badges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-2xl font-bold mb-2">Coming Soon</h3>
        <p className="text-base-content/60 mb-6">
          Badge inventory is being upgraded to support community-created templates. Check back soon!
        </p>
        <a href="/templates" className="btn btn-primary">
          Explore Badge Templates
        </a>
      </div>
    </div>
  );
};
