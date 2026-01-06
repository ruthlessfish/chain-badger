import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the BadgeToken contract (ERC-1155)
 * This is the core NFT contract that holds all badge tokens
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
export const CONTRACT_NAME = "BadgeToken";

const deployBadgeToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🎨 Deploying BadgeToken (ERC-1155)...");

  // Base URI for badge metadata
  // This can be updated later via setBadgeURI() for individual badges
  const baseURI = "https://chain-badger.vercel.app/metadata/";

  const deployment = await deploy(CONTRACT_NAME, {
    from: deployer,
    args: [baseURI],
    log: true,
    autoMine: true,
  });

  // Get contract instance
  const badgeToken = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address);

  // Verify roles
  const DEFAULT_ADMIN_ROLE = await badgeToken.DEFAULT_ADMIN_ROLE();
  const ADMIN_ROLE = await badgeToken.ADMIN_ROLE();
  const MINTER_ROLE = await badgeToken.MINTER_ROLE();

  console.log("✅ BadgeToken deployed successfully!");
  console.log("📝 Base URI:", baseURI);
  console.log("🔑 Roles configured:");
  console.log("   - DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  console.log("   - ADMIN_ROLE:", ADMIN_ROLE);
  console.log("   - MINTER_ROLE:", MINTER_ROLE);
  console.log("⚠️  Note: Grant MINTER_ROLE to BadgeMinter after it's deployed");
};

export default deployBadgeToken;

deployBadgeToken.tags = ["BadgeToken", "Badges"];
