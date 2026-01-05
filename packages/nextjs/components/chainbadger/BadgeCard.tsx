"use client";

import { Badge, RARITY_COLORS } from "~~/types/badge";

interface BadgeCardProps {
  badge: Badge;
  onClaim?: (badgeId: bigint) => void;
  showClaimButton?: boolean;
  isOwned?: boolean;
  balance?: bigint;
}

export const BadgeCard = ({ badge, onClaim, showClaimButton = true, isOwned = false, balance }: BadgeCardProps) => {
  const rarityStyle = RARITY_COLORS[badge.rarity];

  return (
    <div
      className={`
        relative bg-base-200 rounded-xl overflow-hidden
        border-2 ${rarityStyle.border}
        shadow-lg hover:shadow-xl ${rarityStyle.glow}
        transition-all duration-200 hover:scale-105
        flex flex-col
      `}
    >
      {/* Badge Image */}
      <div className="relative aspect-square bg-base-300 flex items-center justify-center">
        {badge.image ? (
          <img src={badge.image} alt={badge.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-6xl">🏆</div>
        )}

        {/* Rarity Badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-semibold bg-base-100/90 ${rarityStyle.border} border`}
        >
          {rarityStyle.label}
        </div>

        {/* Balance indicator for owned badges */}
        {isOwned && balance !== undefined && balance > 0n && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-semibold bg-success/90 text-white">
            Owned {balance > 1n ? `x${balance.toString()}` : "✓"}
          </div>
        )}
      </div>

      {/* Badge Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold mb-1">{badge.name}</h3>
        <p className="text-sm text-base-content/70 mb-2">{badge.category}</p>
        <p className="text-sm text-base-content/60 mb-4 flex-1 line-clamp-3">{badge.description}</p>

        {/* Claim Button */}
        {showClaimButton && !isOwned && onClaim && (
          <button onClick={() => onClaim(badge.id)} className="btn btn-primary btn-sm w-full">
            Claim Badge
          </button>
        )}

        {isOwned && <div className="text-center text-sm font-medium text-success">✓ Claimed</div>}
      </div>
    </div>
  );
};
