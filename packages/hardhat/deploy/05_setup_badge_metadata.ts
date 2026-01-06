import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Optional deployment step to populate BadgeMetadata with initial badge data
 *
 * This runs after all contracts are deployed.
 * You can skip this by using --tags without "setup"
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const setupBadgeMetadata: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { ethers } = hre;

  console.log("\n🎨 Setting up Badge Metadata...\n");

  // Get deployed contracts
  const badgeMetadata = await ethers.getContract("BadgeMetadata", deployer);

  // Badge data
  const BADGES = [
    {
      id: 1,
      name: "Early Adopter",
      description: "One of the first users to try ChainBadger",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=early-adopter&backgroundColor=8b5cf6",
      category: "Community",
      rarity: 2, // Rare
    },
    {
      id: 2,
      name: "Smart Contract Master",
      description: "Deployed your first smart contract",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=smart-contract&backgroundColor=3b82f6",
      category: "Development",
      rarity: 1, // Uncommon
    },
    {
      id: 3,
      name: "Chain Explorer",
      description: "Interacted with 5 different blockchain networks",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=chain-explorer&backgroundColor=10b981",
      category: "Exploration",
      rarity: 0, // Common
    },
    {
      id: 4,
      name: "Transaction Pro",
      description: "Executed 100 successful transactions",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=transaction-pro&backgroundColor=f59e0b",
      category: "Activity",
      rarity: 3, // Epic
    },
    {
      id: 5,
      name: "Badge Collector",
      description: "Collected all available badges",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=badge-collector&backgroundColor=ef4444",
      category: "Achievement",
      rarity: 4, // Legendary
    },
  ];

  // Prepare batch data
  const badgeIds = BADGES.map(b => b.id);
  const badgeInfos = BADGES.map(b => ({
    name: b.name,
    description: b.description,
    image: b.image,
    category: b.category,
    rarity: b.rarity,
  }));

  console.log(`Setting metadata for ${BADGES.length} badges...`);

  // Set all badge data in one transaction
  // @ts-expect-error - Contract methods not typed until after deployment
  const tx = await badgeMetadata.setBadgeDataBatch(badgeIds, badgeInfos);
  await tx.wait();

  console.log("✅ Badge metadata configured!");

  // Verify
  for (const badge of BADGES.slice(0, 2)) {
    // Show first 2 as examples
    // @ts-expect-error - Contract methods not typed until after deployment
    const data = await badgeMetadata.getBadgeMetadata(badge.id);
    console.log(`   Badge #${badge.id}: ${data.name} (${data.rarity})`);
  }
  console.log(`   ... and ${BADGES.length - 2} more badges`);
};

export default setupBadgeMetadata;

// This script is optional - deploy without it by excluding the "setup" tag
setupBadgeMetadata.tags = ["setup", "BadgeMetadataSetup"];
setupBadgeMetadata.dependencies = ["BadgeMetadata"];
// Set runAtTheEnd to ensure this runs after all other deployments
setupBadgeMetadata.runAtTheEnd = true;
