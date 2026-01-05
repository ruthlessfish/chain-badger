"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { OwnedBadgeGrid } from "~~/components/chainbadger";

const MyBadges: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="flex items-center flex-col grow pt-10">
      {/* Page Header */}
      <div className="px-5 max-w-5xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">My Badge Collection</h1>
        <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
          Your on-chain achievements, verifiable and truly yours
        </p>

        {connectedAddress && (
          <div className="mt-6 p-4 bg-base-200 rounded-lg border border-base-300 inline-block">
            <p className="text-sm text-base-content/60 mb-1">Viewing badges for:</p>
            <p className="font-mono text-sm">{connectedAddress}</p>
          </div>
        )}
      </div>

      {/* Owned Badges Grid */}
      <div className="w-full px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <OwnedBadgeGrid />
        </div>
      </div>
    </div>
  );
};

export default MyBadges;
