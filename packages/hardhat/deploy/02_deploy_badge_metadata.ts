import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the BadgeMetadata contract (Optional)
 * Manages dynamic metadata for badges without redeploying BadgeToken
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
export const CONTRACT_NAME = "BadgeMetadata";

const deployBadgeMetadata: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n📚 Deploying BadgeMetadata (Dynamic Metadata)...");

  // Get the deployer/owner address
  const [deployerSigner] = await hre.ethers.getSigners();
  const initialOwner = deployerSigner.address;

  console.log("👤 Initial owner:", initialOwner);

  // Base URI for generating token URIs
  const baseURI = "https://api.chainbadger.com/metadata/";

  const deployment = await deploy(CONTRACT_NAME, {
    from: deployer,
    args: [initialOwner, baseURI],
    log: true,
    autoMine: true,
  });

  // Get contract instance
  const badgeMetadata = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address);

  // Verify configuration
  const owner = await badgeMetadata.owner();
  const configuredBaseURI = await badgeMetadata.baseURI();

  console.log("✅ BadgeMetadata deployed successfully!");
  console.log("📝 Configuration:");
  console.log("   - Owner:", owner);
  console.log("   - Base URI:", configuredBaseURI);
  console.log("\n💡 Usage:");
  console.log("   - Use setBadgeData() to add badge metadata");
  console.log("   - Use setBadgeDataBatch() for multiple badges");
  console.log("   - Frontend can call getMetadataJSON() for display");
};

export default deployBadgeMetadata;

// This is optional and can be deployed independently
deployBadgeMetadata.tags = ["BadgeMetadata", "Badges"];
