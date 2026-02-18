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

    let badgeTemplateDeployment;
    try {
      badgeTemplateDeployment = await hre.deployments.get("BadgeTemplate");
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
    if (badgeTemplateDeployment) {
      console.log(`   BadgeTemplate: ${badgeTemplateDeployment.address}`);
    }

    const badgeToken = await hre.ethers.getContractAt("BadgeToken", badgeTokenDeployment.address);
    const badgeMinter = await hre.ethers.getContractAt("BadgeMinter", badgeMinterDeployment.address);

    const MINTER_ROLE = await badgeToken.MINTER_ROLE();
    const hasRole = await badgeToken.hasRole(MINTER_ROLE, badgeMinterDeployment.address);

    console.log("\nPermissions:");
    console.log(`   MINTER_ROLE granted to BadgeMinter: ${hasRole ? "YES" : "NO"}`);

    const owner = await badgeMinter.owner();
    console.log(`   Owner: ${owner}`);

    if (badgeTemplateDeployment) {
      try {
        const badgeMinterAny = badgeMinter as any;
        const linkedTemplate = await badgeMinterAny.badgeTemplate();
        const templateLinked = linkedTemplate.toLowerCase() === badgeTemplateDeployment.address.toLowerCase();
        console.log(`   BadgeMinter → BadgeTemplate linked: ${templateLinked ? "YES" : "NO"}`);

        const badgeTemplate = await hre.ethers.getContractAt("BadgeTemplate", badgeTemplateDeployment.address);
        const authorizedMinter = await badgeTemplate.authorizedMinter();
        const minterAuthorized = authorizedMinter.toLowerCase() === badgeMinterDeployment.address.toLowerCase();
        console.log(`   BadgeTemplate → authorizedMinter set: ${minterAuthorized ? "YES" : "NO"}`);
        console.log(`   Next Template ID: ${(await badgeTemplate.nextTemplateId()).toString()}`);
        console.log(`   Next Badge ID:    ${(await badgeTemplate.nextBadgeId()).toString()}`);
      } catch {
        console.log("   (BadgeTemplate link info unavailable — run 07_setup_template_roles)");
      }
    }

    console.log("\nNext Steps:");
    console.log("   1. Run 'yarn generate' to update frontend TypeScript types");
    console.log("   2. Configure SIGNER_PRIVATE_KEY in packages/nextjs/.env.local");
    console.log("   3. Create badge templates via /create-template");
    console.log("   4. Test claiming a template badge");

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
