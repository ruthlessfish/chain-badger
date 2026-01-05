import { ethers } from "hardhat";

/**
 * Helper script to display the signer information needed for the claim flow
 * Run with: yarn hardhat run scripts/displaySignerInfo.ts --network localhost
 */
async function main() {
  console.log("\n🔍 ChainBadger Signer Information\n");

  const [deployer, signer] = await ethers.getSigners();

  console.log("For local development with Hardhat node:\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Account 0 (Deployer):");
  console.log("  Address:", deployer.address);
  console.log("  Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n📝 Setup Instructions:\n");
  console.log("1. Create/edit packages/nextjs/.env.local");
  console.log("2. Add this line:\n");
  console.log("   BADGE_SIGNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("\n3. Restart your Next.js dev server:");
  console.log("   cd packages/nextjs");
  console.log("   yarn start\n");

  console.log("⚠️  IMPORTANT: Never commit .env.local to version control!\n");
  console.log("⚠️  For production, use a dedicated signer account, not the deployer!\n");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
