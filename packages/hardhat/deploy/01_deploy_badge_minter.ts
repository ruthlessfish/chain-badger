import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the BadgeMinter contract
 * Handles EIP-712 signature-based badge claims with replay protection
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
export const CONTRACT_NAME = "BadgeMinter";

const deployBadgeMinter: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🔐 Deploying BadgeMinter (EIP-712 Claims)...");
  
  // Get the deployed BadgeToken address
  const badgeTokenDeployment = await hre.deployments.get("BadgeToken");
  const badgeTokenAddress = badgeTokenDeployment.address;
  
  console.log("📎 BadgeToken address:", badgeTokenAddress);

  // Get the deployer/owner address
  const [deployerSigner] = await hre.ethers.getSigners();
  const signerAddress = deployerSigner.address; // In production, use a dedicated backend signer
  const initialOwner = deployerSigner.address;

  console.log("🔑 Authorized signer:", signerAddress);
  console.log("👤 Initial owner:", initialOwner);

  const deployment = await deploy(CONTRACT_NAME, {
    from: deployer,
    args: [badgeTokenAddress, signerAddress, initialOwner],
    log: true,
    autoMine: true,
  });

  // Get contract instance
  const badgeMinter = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address);

  // Verify configuration
  const configuredBadgeToken = await badgeMinter.badgeToken();
  const owner = await badgeMinter.owner();

  console.log("✅ BadgeMinter deployed successfully!");
  console.log("📝 Configuration:");
  console.log("   - BadgeToken:", configuredBadgeToken);
  console.log("   - Authorized Signer:", signerAddress);
  console.log("   - Owner:", owner);
  console.log("\n⚠️  IMPORTANT: Grant MINTER_ROLE to this contract!");
  console.log(`   Run: BadgeToken.grantRole(MINTER_ROLE, "${deployment.address}")`);
};

export default deployBadgeMinter;

// This deployment requires BadgeToken to be deployed first
deployBadgeMinter.tags = ["BadgeMinter", "Badges"];
deployBadgeMinter.dependencies = ["BadgeToken"];
