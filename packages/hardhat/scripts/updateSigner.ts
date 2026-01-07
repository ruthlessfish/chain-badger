import { ethers } from "hardhat";

/**
 * Update the signer address in BadgeMinter contract
 * Usage: yarn hardhat run scripts/updateSigner.ts --network sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Updating signer with account:", deployer.address);

  // New signer address (from Hardhat account #0 private key in .env.local)
  const newSignerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  // Get BadgeMinter deployment
  const badgeMinterAddress = "0x4B0C6Df87c8A72974f56c9e6B8CE0Ca72BFDDf5e";
  const badgeMinter = await ethers.getContractAt("BadgeMinter", badgeMinterAddress);

  // Check current signer
  const currentSigner = await badgeMinter.signer();
  console.log("Current signer:", currentSigner);
  console.log("New signer:", newSignerAddress);

  if (currentSigner.toLowerCase() === newSignerAddress.toLowerCase()) {
    console.log("✅ Signer is already set correctly!");
    return;
  }

  // Update signer
  console.log("Updating signer...");
  const tx = await badgeMinter.setSigner(newSignerAddress);
  await tx.wait();

  // Verify
  const updatedSigner = await badgeMinter.signer();
  console.log("✅ Signer updated successfully!");
  console.log("New signer:", updatedSigner);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
