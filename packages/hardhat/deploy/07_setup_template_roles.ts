import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Links BadgeMinter ↔ BadgeTemplate after both are deployed:
 *   1. Calls BadgeMinter.setBadgeTemplate() so the minter knows which template registry to read
 *   2. Calls BadgeTemplate.setAuthorizedMinter() so BadgeMinter can increment claim counts
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const setupTemplateRoles: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("\n🔗 Linking BadgeMinter ↔ BadgeTemplate...");

  try {
    const badgeMinterDeployment = await hre.deployments.get("BadgeMinter");
    const badgeTemplateDeployment = await hre.deployments.get("BadgeTemplate");

    const badgeMinterAddress = badgeMinterDeployment.address;
    const badgeTemplateAddress = badgeTemplateDeployment.address;

    const badgeMinter = await hre.ethers.getContractAt("BadgeMinter", badgeMinterAddress);
    const badgeTemplate = await hre.ethers.getContractAt("BadgeTemplate", badgeTemplateAddress);

    // ---------------------------------------------------------------
    // Step 1: Tell BadgeMinter where BadgeTemplate lives
    // ---------------------------------------------------------------
    const currentTemplate = await badgeMinter.badgeTemplate();

    if (currentTemplate.toLowerCase() === badgeTemplateAddress.toLowerCase()) {
      console.log("✅ BadgeMinter already has correct BadgeTemplate reference");
    } else {
      console.log("📝 Setting BadgeTemplate on BadgeMinter...");
      const tx1 = await badgeMinter.setBadgeTemplate(badgeTemplateAddress);
      await tx1.wait();
      console.log("✅ BadgeMinter.setBadgeTemplate() complete");
      console.log("   Transaction:", tx1.hash);
    }

    // ---------------------------------------------------------------
    // Step 2: Tell BadgeTemplate that BadgeMinter can increment counts
    // ---------------------------------------------------------------
    const currentMinter = await badgeTemplate.authorizedMinter();

    if (currentMinter.toLowerCase() === badgeMinterAddress.toLowerCase()) {
      console.log("✅ BadgeTemplate already has correct authorizedMinter");
    } else {
      console.log("📝 Setting authorizedMinter on BadgeTemplate...");
      const tx2 = await badgeTemplate.setAuthorizedMinter(badgeMinterAddress);
      await tx2.wait();
      console.log("✅ BadgeTemplate.setAuthorizedMinter() complete");
      console.log("   Transaction:", tx2.hash);
    }

    // ---------------------------------------------------------------
    // Verification
    // ---------------------------------------------------------------
    const verifyTemplate = await badgeMinter.badgeTemplate();
    const verifyMinter = await badgeTemplate.authorizedMinter();

    if (
      verifyTemplate.toLowerCase() !== badgeTemplateAddress.toLowerCase() ||
      verifyMinter.toLowerCase() !== badgeMinterAddress.toLowerCase()
    ) {
      throw new Error("Link verification failed — addresses do not match");
    }

    console.log("\n✅ BadgeMinter ↔ BadgeTemplate linked successfully!");
    console.log("📋 Summary:");
    console.log(`   - BadgeMinter:   ${badgeMinterAddress}`);
    console.log(`   - BadgeTemplate: ${badgeTemplateAddress}`);
    console.log(`   - BadgeMinter.badgeTemplate → ${verifyTemplate}`);
    console.log(`   - BadgeTemplate.authorizedMinter → ${verifyMinter}`);
  } catch (error) {
    console.error("❌ Error linking contracts:", error);
    throw error;
  }
};

export default setupTemplateRoles;
setupTemplateRoles.runAtTheEnd = true;
setupTemplateRoles.dependencies = ["BadgeMinter", "BadgeTemplate"];
setupTemplateRoles.tags = ["BadgeSetup", "Badges"];
