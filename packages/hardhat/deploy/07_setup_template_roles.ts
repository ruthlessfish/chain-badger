import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Sets up template roles and connections:
 * 1. Sets BadgeTemplate address on BadgeMinter
 * 2. Sets BadgeMinter as authorized minter on BadgeTemplate
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const setupTemplateRoles: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { get } = hre.deployments;

  console.log("\n🔧 Setting up BadgeTemplate integration...");

  try {
    // Get deployed contracts
    const badgeMinterDeployment = await get("BadgeMinter");
    const badgeTemplateDeployment = await get("BadgeTemplate");

    const badgeMinter = await hre.ethers.getContractAt("BadgeMinter", badgeMinterDeployment.address);
    const badgeTemplate = await hre.ethers.getContractAt("BadgeTemplate", badgeTemplateDeployment.address);

    // 1. Set BadgeTemplate on BadgeMinter
    console.log("📝 Setting BadgeTemplate address on BadgeMinter...");
    const setBadgeTemplateTx = await badgeMinter.setBadgeTemplate(badgeTemplateDeployment.address);
    await setBadgeTemplateTx.wait();
    console.log("✅ BadgeTemplate set on BadgeMinter");

    // 2. Set BadgeMinter as authorized minter on BadgeTemplate
    console.log("📝 Setting BadgeMinter as authorized minter on BadgeTemplate...");
    const setMinterTx = await badgeTemplate.setAuthorizedMinter(badgeMinterDeployment.address);
    await setMinterTx.wait();
    console.log("✅ BadgeMinter authorized on BadgeTemplate");

    // Verify setup
    const templateOnMinter = await badgeMinter.badgeTemplate();
    const authorizedMinter = await badgeTemplate.authorizedMinter();

    console.log("\n✅ Template integration setup complete!");
    console.log("🔗 Connections:");
    console.log("   - BadgeMinter.badgeTemplate:", templateOnMinter);
    console.log("   - BadgeTemplate.authorizedMinter:", authorizedMinter);
  } catch (error) {
    console.error("❌ Error setting up template roles:", error);
    throw error;
  }
};

export default setupTemplateRoles;

setupTemplateRoles.tags = ["BadgeSetup", "Badges"];
setupTemplateRoles.dependencies = ["BadgeMinter", "BadgeTemplate"];
setupTemplateRoles.runAtTheEnd = true;
