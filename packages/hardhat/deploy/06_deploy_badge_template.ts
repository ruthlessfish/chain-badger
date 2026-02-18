import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the BadgeTemplate contract
 * Permissionless registry for user-created badge templates with on-chain requirements
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
export const CONTRACT_NAME = "BadgeTemplate";

const deployBadgeTemplate: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🏷️  Deploying BadgeTemplate (Permissionless Template Registry)...");

  const [deployerSigner] = await hre.ethers.getSigners();
  const initialOwner = deployerSigner.address;

  console.log("👤 Initial owner:", initialOwner);

  const deployment = await deploy(CONTRACT_NAME, {
    from: deployer,
    args: [initialOwner],
    log: true,
    autoMine: true,
  });

  const badgeTemplate = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address);

  const nextTemplateId = await badgeTemplate.nextTemplateId();
  const nextBadgeId = await badgeTemplate.nextBadgeId();
  const templateVersion = await badgeTemplate.CURRENT_TEMPLATE_VERSION();

  console.log("✅ BadgeTemplate deployed successfully!");
  console.log("📝 Configuration:");
  console.log("   - Next Template ID:", nextTemplateId.toString());
  console.log("   - Next Badge ID:", nextBadgeId.toString());
  console.log("   - Template Version:", templateVersion.toString());
  console.log("   - Owner:", initialOwner);
  console.log("\n💡 Next: Run 07_setup_template_roles to link BadgeMinter → BadgeTemplate");
};

export default deployBadgeTemplate;
deployBadgeTemplate.tags = ["BadgeTemplate", "Badges"];
