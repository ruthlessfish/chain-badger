import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the BadgeTemplate contract
 * Manages user-created badge templates with requirements and supply caps
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
export const CONTRACT_NAME = "BadgeTemplate";

const deployBadgeTemplate: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n📋 Deploying BadgeTemplate...");

  const deployment = await deploy(CONTRACT_NAME, {
    from: deployer,
    args: [deployer], // initial owner
    log: true,
    autoMine: true,
  });

  // Get contract instance
  const badgeTemplate = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address);

  console.log("✅ BadgeTemplate deployed successfully!");
  console.log("🔢 Initial state:");
  console.log("   - nextTemplateId:", await badgeTemplate.nextTemplateId());
  console.log("   - nextBadgeId:", await badgeTemplate.nextBadgeId());
  console.log("   - TEMPLATE_BADGE_ID_START:", await badgeTemplate.TEMPLATE_BADGE_ID_START());
  console.log("   - CURRENT_TEMPLATE_VERSION:", await badgeTemplate.CURRENT_TEMPLATE_VERSION());
  console.log("⚠️  Note: Set authorized minter after BadgeMinter is deployed");
};

export default deployBadgeTemplate;

deployBadgeTemplate.tags = ["BadgeTemplate", "Badges"];
