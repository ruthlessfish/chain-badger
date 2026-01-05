import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Setup script to grant necessary roles after all contracts are deployed
 * This grants MINTER_ROLE to the BadgeMinter contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const setupRoles: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("\n🔐 Setting up roles and permissions...");

  try {
    // Get deployed contracts
    const badgeTokenDeployment = await hre.deployments.get("BadgeToken");
    const badgeMinterDeployment = await hre.deployments.get("BadgeMinter");

    const badgeTokenAddress = badgeTokenDeployment.address;
    const badgeMinterAddress = badgeMinterDeployment.address;

    // Get contract instances
    const badgeToken = await hre.ethers.getContractAt("BadgeToken", badgeTokenAddress);

    // Get the MINTER_ROLE
    const MINTER_ROLE = await badgeToken.MINTER_ROLE();

    // Check if BadgeMinter already has the role
    const hasRole = await badgeToken.hasRole(MINTER_ROLE, badgeMinterAddress);

    if (hasRole) {
      console.log("✅ BadgeMinter already has MINTER_ROLE");
    } else {
      console.log("📝 Granting MINTER_ROLE to BadgeMinter...");

      // Grant the role
      const tx = await badgeToken.grantRole(MINTER_ROLE, badgeMinterAddress);
      await tx.wait();

      console.log("✅ MINTER_ROLE granted successfully!");
      console.log("   Transaction:", tx.hash);
    }

    // Verify the role was granted
    const hasRoleNow = await badgeToken.hasRole(MINTER_ROLE, badgeMinterAddress);
    if (!hasRoleNow) {
      throw new Error("Failed to grant MINTER_ROLE");
    }

    console.log("\n✅ All roles configured!");
    console.log("📋 Summary:");
    console.log(`   - BadgeToken: ${badgeTokenAddress}`);
    console.log(`   - BadgeMinter: ${badgeMinterAddress}`);
    console.log(`   - MINTER_ROLE: ${MINTER_ROLE}`);
    console.log("\n🚀 ChainBadger system is ready to use!");
  } catch (error) {
    console.error("❌ Error setting up roles:", error);
    throw error;
  }
};

export default setupRoles;

// Run this after all badge contracts are deployed
setupRoles.tags = ["BadgeSetup", "Badges"];
setupRoles.dependencies = ["BadgeToken", "BadgeMinter"];
setupRoles.runAtTheEnd = true;
