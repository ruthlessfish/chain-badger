/**
 * Helper hook to fetch all available badges from the blockchain
 * Combines metadata from BadgeMetadata and ownership from BadgeToken
 */
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { Badge, BadgeRarity } from "~~/types/badge";

// Known badge IDs from deployment (badges 1-5)
const BADGE_IDS = [1n, 2n, 3n, 4n, 5n];

export function useBadges() {
  const { address } = useAccount();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ownedBadgeIds, setOwnedBadgeIds] = useState<Set<bigint>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch metadata for each badge
  const badge1 = useScaffoldReadContract({
    contractName: "BadgeMetadata",
    functionName: "getBadgeMetadata",
    args: [1n],
  });

  const badge2 = useScaffoldReadContract({
    contractName: "BadgeMetadata",
    functionName: "getBadgeMetadata",
    args: [2n],
  });

  const badge3 = useScaffoldReadContract({
    contractName: "BadgeMetadata",
    functionName: "getBadgeMetadata",
    args: [3n],
  });

  const badge4 = useScaffoldReadContract({
    contractName: "BadgeMetadata",
    functionName: "getBadgeMetadata",
    args: [4n],
  });

  const badge5 = useScaffoldReadContract({
    contractName: "BadgeMetadata",
    functionName: "getBadgeMetadata",
    args: [5n],
  });

  // Fetch ownership for each badge
  const balance1 = useScaffoldReadContract({
    contractName: "BadgeToken",
    functionName: "balanceOf",
    args: [address, 1n],
  });

  const balance2 = useScaffoldReadContract({
    contractName: "BadgeToken",
    functionName: "balanceOf",
    args: [address, 2n],
  });

  const balance3 = useScaffoldReadContract({
    contractName: "BadgeToken",
    functionName: "balanceOf",
    args: [address, 3n],
  });

  const balance4 = useScaffoldReadContract({
    contractName: "BadgeToken",
    functionName: "balanceOf",
    args: [address, 4n],
  });

  const balance5 = useScaffoldReadContract({
    contractName: "BadgeToken",
    functionName: "balanceOf",
    args: [address, 5n],
  });

  const metadataQueries = [badge1, badge2, badge3, badge4, badge5];
  const balanceQueries = [balance1, balance2, balance3, balance4, balance5];

  // Update badges when metadata is loaded
  useEffect(() => {
    const updatedBadges: Badge[] = [];

    metadataQueries.forEach((query, index) => {
      if (query.data) {
        const metadata = query.data as any;
        updatedBadges.push({
          id: BADGE_IDS[index],
          name: metadata.name || "Unknown Badge",
          description: metadata.description || "",
          image: metadata.image || "",
          category: metadata.category || "",
          rarity: Number(metadata.rarity) as BadgeRarity,
        });
      }
    });

    if (updatedBadges.length > 0) {
      setBadges(updatedBadges);
    }

    // Check if all queries are done
    const allLoaded = metadataQueries.every(q => !q.isLoading);
    if (allLoaded) {
      setLoading(false);
    }
  }, [
    badge1.data,
    badge2.data,
    badge3.data,
    badge4.data,
    badge5.data,
    badge1.isLoading,
    badge2.isLoading,
    badge3.isLoading,
    badge4.isLoading,
    badge5.isLoading,
  ]);

  // Update owned badges when balance data is loaded
  useEffect(() => {
    if (!address) {
      setOwnedBadgeIds(new Set());
      return;
    }

    const owned = new Set<bigint>();
    balanceQueries.forEach((query, index) => {
      if (query.data && query.data > 0n) {
        owned.add(BADGE_IDS[index]);
      }
    });

    setOwnedBadgeIds(owned);
  }, [address, balance1.data, balance2.data, balance3.data, balance4.data, balance5.data]);

  return {
    badges,
    ownedBadgeIds,
    loading,
    refetch: () => {
      metadataQueries.forEach(q => q.refetch?.());
      balanceQueries.forEach(q => q.refetch?.());
    },
  };
}
