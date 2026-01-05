import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploymentSummary: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("\n" + "=".repeat(60));
  console.log("CHAINBADGER DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));

  try {
    const badgeTokenDeployment = await hre.deployments.get("BadgeToken");
    const badgeMinterDeployment = await hre.deployments.get("BadgeMinter");
    
    let badgeMetadataDeployment;
    try {
      badgeMetadataDeployment = await hre.deployments.get("BadgeMetadata");
    } catch {
      // Optional
    }

    const provider = hre.ethers.provider;
    const network = await provider.getNetwork();

    console.log("\nNetwork:");
    console.log(`   Chain ID: ${network.chainId}`);
    console.log(`   Name: ${network.name}`);

    console.log("\nContracts:");
    console.log(`   BadgeToken:    ${badgeTokenDeployment.address}`);
    console.log(`   BadgeMinter:   ${badgeMinterDeployment.address}`);
    if (badgeMetadataDeployment) {
      console.log(`   BadgeMetadata: ${badgeMetadataDeployment.address}`);
    }

    const badgeToken = await hre.ethers.getContractAt("BadgeToken", badgeTokenDeployment.address);
    const badgeMinter = await hre.ethers.getContractAt("BadgeMinter", badgeMinterDeployment.address);

    const MINTER_ROLE = await badgeToken.MINTER_ROLE();
    const hasRole = await badgeToken.hasRole(MINTER_ROLE, badgeMinterDeployment.address);

    console.log("\nPermissions:");
    console.log(`   MINTER_ROLE: ${hasRole ? "YES" : "NO"}`);

    const owner = await badgeMinter.owner();
    console.log(`   Owner: ${owner}`);

    console.log("\nNext Steps:");
    console.log("   1. Run 'yarn generate' to update frontend");
    console.log("   2. Configure backend signer for EIP-712");
    console.log("   3. Add badge metadata (optional)");
    console.log("   4. Test claiming a badge");

    console.log("\n" + "=".repeat(60));
    console.log("Happy badging!");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("Error:", error);
  }
};

export default deploymentSummary;

deploymentSummary.tags = ["Summary", "Badges"];
deploymentSummary.dependencies = ["BadgeToken", "BadgeMinter", "BadgeSetup"];
deploymentSummary.runAtTheEnd = true;
