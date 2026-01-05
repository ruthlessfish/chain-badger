"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BadgeGrid } from "~~/components/chainbadger";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [isClaimingBadge, setIsClaimingBadge] = useState(false);

  const handleClaimBadge = async (badgeId: bigint) => {
    if (!connectedAddress) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsClaimingBadge(true);
    try {
      // TODO: Implement claim flow
      // 1. Request signature from backend API
      // 2. Call BadgeMinter.claimBadge() with signature
      console.log(`Claiming badge ${badgeId}...`);
      alert(`Claim flow for badge ${badgeId} not yet implemented. Coming soon!`);
    } catch (error) {
      console.error("Error claiming badge:", error);
      alert("Failed to claim badge. Please try again.");
    } finally {
      setIsClaimingBadge(false);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        {/* Hero Section */}
        <div className="px-5 max-w-5xl mx-auto text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            ChainBadger
          </h1>
          <p className="text-2xl mb-2 text-base-content/80">On-Chain Achievement Badges</p>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            Mint verifiable, ownable badges that prove your skills, participation, and contributions. Your achievements,
            truly yours.
          </p>

          {!connectedAddress && (
            <div className="mt-8 p-6 bg-base-200 rounded-lg border border-base-300">
              <p className="text-lg mb-4">👋 Connect your wallet to get started</p>
              <p className="text-sm text-base-content/60">
                View available badges and claim achievements that showcase your web3 journey
              </p>
            </div>
          )}
        </div>

        {/* Badge Grid Section */}
        <div className="w-full px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Available Badges</h2>
              <p className="text-base-content/60">
                {connectedAddress
                  ? "Claim badges to showcase your achievements"
                  : "Connect your wallet to claim badges"}
              </p>
            </div>

            {isClaimingBadge && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Processing claim...</span>
                </div>
              </div>
            )}

            <BadgeGrid onClaimBadge={handleClaimBadge} />
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="w-full bg-base-200 mt-auto px-8 py-12">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Why ChainBadger?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-3">🔒</div>
                <h4 className="text-xl font-semibold mb-2">Trustless & Verifiable</h4>
                <p className="text-base-content/70">
                  All badges are stored on-chain with cryptographic proof of authenticity
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎯</div>
                <h4 className="text-xl font-semibold mb-2">Truly Ownable</h4>
                <p className="text-base-content/70">
                  Your achievements belong to you, portable across platforms and wallets
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">⚡</div>
                <h4 className="text-xl font-semibold mb-2">Gasless Claiming</h4>
                <p className="text-base-content/70">
                  Signature-based verification makes claiming badges fast and affordable
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
