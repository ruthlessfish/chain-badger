/**
 * Setup Script: Populate BadgeMetadata Contract
 *
 * This script populates the BadgeMetadata contract with initial badge data.
 * Run this after deploying all contracts.
 *
 * Usage:
 *   yarn hardhat run scripts/setupBadgeMetadata.ts --network <network>
 *
 * Example:
 *   yarn hardhat run scripts/setupBadgeMetadata.ts --network base-sepolia
 */

import hre from "hardhat";

// Badge metadata definitions
const BADGES = [
  {
    id: 1,
    name: "Early Adopter",
    description: "One of the first users to try ChainBadger",
    image: "https://api.chainbadger.com/images/early-adopter.png",
    category: "Community",
    rarity: 2, // Rare
  },
  {
    id: 2,
    name: "Smart Contract Master",
    description: "Deployed your first smart contract",
    image: "https://api.chainbadger.com/images/smart-contract-master.png",
    category: "Development",
    rarity: 1, // Uncommon
  },
  {
    id: 3,
    name: "Chain Explorer",
    description: "Interacted with 5 different blockchain networks",
    image: "https://api.chainbadger.com/images/chain-explorer.png",
    category: "Exploration",
    rarity: 0, // Common
  },
  {
    id: 4,
    name: "Transaction Pro",
    description: "Executed 100 successful transactions",
    image: "https://api.chainbadger.com/images/transaction-pro.png",
    category: "Activity",
    rarity: 3, // Epic
  },
  {
    id: 5,
    name: "Badge Collector",
    description: "Collected all available badges",
    image: "https://api.chainbadger.com/images/badge-collector.png",
    category: "Achievement",
    rarity: 4, // Legendary
  },
];

async function main() {
  console.log("\n🎨 Setting up Badge Metadata...\n");

  const network = hre.network.name;
  console.log(`Network: ${network}`);

  // Get the deployed BadgeMetadata contract
  const BadgeMetadata = await hre.ethers.getContractFactory("BadgeMetadata");

  let badgeMetadataAddress: string;
  try {
    // Use hre.deployments.get instead of require
    const deployment = await hre.deployments.get("BadgeMetadata");
    badgeMetadataAddress = deployment.address;
    console.log(`BadgeMetadata contract: ${badgeMetadataAddress}`);
  } catch {
    console.error(`❌ BadgeMetadata contract not found for network ${network}`);
    console.error(`   Please deploy contracts first using: yarn deploy --network ${network}`);
    process.exit(1);
  }

  const badgeMetadata = BadgeMetadata.attach(badgeMetadataAddress);

  // Check if we can use batch function or need individual calls
  const useBatch = BADGES.length > 1;

  if (useBatch) {
    console.log(`\n📦 Setting badge data in batch (${BADGES.length} badges)...`);

    const badgeIds = BADGES.map(b => b.id);
    const badgeInfos = BADGES.map(b => ({
      name: b.name,
      description: b.description,
      image: b.image,
      category: b.category,
      rarity: b.rarity,
    }));

    try {
      // @ts-expect-error - Contract methods not typed until after deployment
      const tx = await badgeMetadata.setBadgeDataBatch(badgeIds, badgeInfos);
      console.log(`Transaction hash: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Batch metadata set successfully! (Gas used: ${receipt?.gasUsed?.toString()})`);
    } catch (error: any) {
      console.error("❌ Error setting batch metadata:", error.message);

      if (error.message.includes("Ownable: caller is not the owner")) {
        console.error("\n⚠️  You are not the owner of the BadgeMetadata contract.");
        console.error("   Make sure you're using the same account that deployed the contract.");
      }

      process.exit(1);
    }
  } else {
    // Set badges individually (fallback)
    for (const badge of BADGES) {
      console.log(`\nSetting metadata for Badge #${badge.id}: ${badge.name}`);

      const badgeInfo = {
        name: badge.name,
        description: badge.description,
        image: badge.image,
        category: badge.category,
        rarity: badge.rarity,
      };

      try {
        // @ts-expect-error - Contract methods not typed until after deployment
        const tx = await badgeMetadata.setBadgeData(badge.id, badgeInfo);
        console.log(`Transaction hash: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`✅ Metadata set! (Gas used: ${receipt?.gasUsed?.toString()})`);
      } catch (error: any) {
        console.error(`❌ Error setting metadata for badge ${badge.id}:`, error.message);
      }
    }
  }

  // Verify the data was set correctly
  console.log("\n🔍 Verifying badge metadata...\n");

  for (const badge of BADGES) {
    try {
      // @ts-expect-error - Contract methods not typed until after deployment
      const data = await badgeMetadata.getBadgeMetadata(badge.id);
      console.log(`Badge #${badge.id}:`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Description: ${data.description}`);
      console.log(`  Category: ${data.category}`);
      // @ts-expect-error - Contract methods not typed until after deployment
      console.log(`  Rarity: ${data.rarity} (${await badgeMetadata.getBadgeRarity(badge.id)})`);
      console.log(`  Image: ${data.image}`);
      console.log();
    } catch (error: any) {
      console.error(`❌ Error reading badge ${badge.id}:`, error.message);
    }
  }

  console.log("✅ Badge metadata setup complete!\n");
  console.log("📝 Summary:");
  console.log(`   - ${BADGES.length} badges configured`);
  console.log(`   - Network: ${network}`);
  console.log(`   - Contract: ${badgeMetadataAddress}`);
  console.log("\n💡 Next steps:");
  console.log("   1. Set the signer address in BadgeMinter contract");
  console.log("   2. Configure BADGE_SIGNER_PRIVATE_KEY in your .env file");
  console.log("   3. Start your Next.js frontend with: yarn start");
  console.log("   4. Connect your wallet and start claiming badges!\n");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
