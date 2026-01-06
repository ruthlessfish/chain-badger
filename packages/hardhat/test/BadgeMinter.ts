import { expect } from "chai";
import { ethers } from "hardhat";
import { BadgeToken, BadgeMinter } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { TypedDataDomain, TypedDataField } from "ethers";

describe("BadgeMinter", function () {
  let badgeToken: BadgeToken;
  let badgeMinter: BadgeMinter;
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let newSigner: SignerWithAddress;

  const BASE_URI = "https://chain-badger.vercel.app/metadata/";
  const BADGE_ID_1 = 1;
  const BADGE_ID_2 = 2;

  // EIP-712 Domain and Types
  let domain: TypedDataDomain;
  const types: Record<string, TypedDataField[]> = {
    Claim: [
      { name: "user", type: "address" },
      { name: "badgeId", type: "uint256" },
    ],
  };

  beforeEach(async function () {
    [owner, signer, user1, user2, newSigner] = await ethers.getSigners();

    // Deploy BadgeToken
    const BadgeToken = await ethers.getContractFactory("BadgeToken");
    badgeToken = await BadgeToken.deploy(BASE_URI);
    await badgeToken.waitForDeployment();

    // Deploy BadgeMinter
    const BadgeMinter = await ethers.getContractFactory("BadgeMinter");
    badgeMinter = await BadgeMinter.deploy(await badgeToken.getAddress(), signer.address, owner.address);
    await badgeMinter.waitForDeployment();

    // Grant MINTER_ROLE to BadgeMinter contract
    const MINTER_ROLE = await badgeToken.MINTER_ROLE();
    await badgeToken.grantRole(MINTER_ROLE, await badgeMinter.getAddress());

    // Setup EIP-712 domain
    domain = {
      name: "BadgeMinter",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await badgeMinter.getAddress(),
    };
  });

  describe("Deployment", function () {
    it("Should set the correct BadgeToken address", async function () {
      expect(await badgeMinter.badgeToken()).to.equal(await badgeToken.getAddress());
    });

    it("Should set the correct signer address", async function () {
      expect(await badgeMinter.signer()).to.equal(signer.address);
    });

    it("Should set the correct owner", async function () {
      expect(await badgeMinter.owner()).to.equal(owner.address);
    });

    it("Should revert if BadgeToken address is zero", async function () {
      const BadgeMinter = await ethers.getContractFactory("BadgeMinter");
      await expect(BadgeMinter.deploy(ethers.ZeroAddress, signer.address, owner.address)).to.be.revertedWithCustomError(
        badgeMinter,
        "InvalidAddress",
      );
    });

    it("Should revert if signer address is zero", async function () {
      const BadgeMinter = await ethers.getContractFactory("BadgeMinter");
      await expect(
        BadgeMinter.deploy(await badgeToken.getAddress(), ethers.ZeroAddress, owner.address),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidAddress");
    });
  });

  describe("EIP-712 Signature Verification", function () {
    it("Should generate correct domain separator", async function () {
      const domainSeparator = await badgeMinter.getDomainSeparator();
      expect(domainSeparator).to.match(/^0x[a-fA-F0-9]{64}$/); // 32 bytes hex string
    });

    it("Should generate correct claim digest", async function () {
      const digest = await badgeMinter.getClaimDigest(user1.address, BADGE_ID_1);
      expect(digest).to.match(/^0x[a-fA-F0-9]{64}$/); // 32 bytes hex string
    });

    it("Should accept valid signature from authorized signer", async function () {
      const message = {
        user: user1.address,
        badgeId: BADGE_ID_1,
      };

      const signature = await signer.signTypedData(domain, types, message);

      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature))
        .to.emit(badgeMinter, "BadgeClaimed")
        .withArgs(user1.address, BADGE_ID_1);
    });

    it("Should reject signature from unauthorized signer", async function () {
      const message = {
        user: user1.address,
        badgeId: BADGE_ID_1,
      };

      // Sign with user2 instead of authorized signer
      const signature = await user2.signTypedData(domain, types, message);

      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature)).to.be.revertedWithCustomError(
        badgeMinter,
        "InvalidSignature",
      );
    });

    it("Should reject signature for wrong user", async function () {
      const message = {
        user: user2.address, // Signature for user2
        badgeId: BADGE_ID_1,
      };

      const signature = await signer.signTypedData(domain, types, message);

      // user1 tries to use user2's signature
      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature)).to.be.revertedWithCustomError(
        badgeMinter,
        "InvalidSignature",
      );
    });

    it("Should reject signature for wrong badge ID", async function () {
      const message = {
        user: user1.address,
        badgeId: BADGE_ID_2, // Signature for badge 2
      };

      const signature = await signer.signTypedData(domain, types, message);

      // user1 tries to claim badge 1 with badge 2 signature
      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature)).to.be.revertedWithCustomError(
        badgeMinter,
        "InvalidSignature",
      );
    });

    it("Should reject malformed signature", async function () {
      const invalidSignature = "0x1234";

      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, invalidSignature)).to.be.reverted;
    });
  });

  describe("Badge Claiming", function () {
    async function getSignature(user: string, badgeId: number) {
      const message = { user, badgeId };
      return await signer.signTypedData(domain, types, message);
    }

    it("Should mint badge to user upon successful claim", async function () {
      const signature = await getSignature(user1.address, BADGE_ID_1);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature);

      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_1)).to.equal(1);
    });

    it("Should mark badge as claimed", async function () {
      const signature = await getSignature(user1.address, BADGE_ID_1);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature);

      const claimed = await badgeMinter.hasClaimed(user1.address, BADGE_ID_1);
      void expect(claimed).to.be.true;
    });

    it("Should emit BadgeClaimed event", async function () {
      const signature = await getSignature(user1.address, BADGE_ID_1);

      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature))
        .to.emit(badgeMinter, "BadgeClaimed")
        .withArgs(user1.address, BADGE_ID_1);
    });

    it("Should allow different users to claim same badge", async function () {
      const sig1 = await getSignature(user1.address, BADGE_ID_1);
      const sig2 = await getSignature(user2.address, BADGE_ID_1);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, sig1);
      await badgeMinter.connect(user2).claimBadge(BADGE_ID_1, sig2);

      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_1)).to.equal(1);
      expect(await badgeToken.balanceOf(user2.address, BADGE_ID_1)).to.equal(1);
    });

    it("Should allow same user to claim different badges", async function () {
      const sig1 = await getSignature(user1.address, BADGE_ID_1);
      const sig2 = await getSignature(user1.address, BADGE_ID_2);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, sig1);
      await badgeMinter.connect(user1).claimBadge(BADGE_ID_2, sig2);

      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_1)).to.equal(1);
      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_2)).to.equal(1);
    });
  });

  describe("Replay Protection", function () {
    async function getSignature(user: string, badgeId: number) {
      const message = { user, badgeId };
      return await signer.signTypedData(domain, types, message);
    }

    it("Should prevent claiming same badge twice with same signature", async function () {
      const signature = await getSignature(user1.address, BADGE_ID_1);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature);

      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature)).to.be.revertedWithCustomError(
        badgeMinter,
        "AlreadyClaimed",
      );
    });

    it("Should prevent claiming even with new signature", async function () {
      const signature1 = await getSignature(user1.address, BADGE_ID_1);
      const signature2 = await getSignature(user1.address, BADGE_ID_1);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature1);

      // Even with a fresh signature, should be blocked
      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature2)).to.be.revertedWithCustomError(
        badgeMinter,
        "AlreadyClaimed",
      );
    });

    it("Should track claims independently per badge", async function () {
      const sig1 = await getSignature(user1.address, BADGE_ID_1);
      const sig2 = await getSignature(user1.address, BADGE_ID_2);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, sig1);

      const claimed1 = await badgeMinter.hasClaimed(user1.address, BADGE_ID_1);
      let claimed2 = await badgeMinter.hasClaimed(user1.address, BADGE_ID_2);
      void expect(claimed1).to.be.true;
      void expect(claimed2).to.be.false;

      // Can still claim badge 2
      await badgeMinter.connect(user1).claimBadge(BADGE_ID_2, sig2);
      claimed2 = await badgeMinter.hasClaimed(user1.address, BADGE_ID_2);
      void expect(claimed2).to.be.true;
    });

    it("Should track claims independently per user", async function () {
      const sig1 = await getSignature(user1.address, BADGE_ID_1);
      const sig2 = await getSignature(user2.address, BADGE_ID_1);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, sig1);

      const claimed1 = await badgeMinter.hasClaimed(user1.address, BADGE_ID_1);
      let claimed2 = await badgeMinter.hasClaimed(user2.address, BADGE_ID_1);
      void expect(claimed1).to.be.true;
      void expect(claimed2).to.be.false;

      // user2 can still claim the same badge
      await badgeMinter.connect(user2).claimBadge(BADGE_ID_1, sig2);
      claimed2 = await badgeMinter.hasClaimed(user2.address, BADGE_ID_1);
      void expect(claimed2).to.be.true;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update signer", async function () {
      await badgeMinter.setSigner(newSigner.address);
      expect(await badgeMinter.signer()).to.equal(newSigner.address);
    });

    it("Should emit SignerUpdated event", async function () {
      await expect(badgeMinter.setSigner(newSigner.address))
        .to.emit(badgeMinter, "SignerUpdated")
        .withArgs(signer.address, newSigner.address);
    });

    it("Should reject signature from old signer after update", async function () {
      const message = {
        user: user1.address,
        badgeId: BADGE_ID_1,
      };

      const oldSignature = await signer.signTypedData(domain, types, message);

      await badgeMinter.setSigner(newSigner.address);

      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, oldSignature)).to.be.revertedWithCustomError(
        badgeMinter,
        "InvalidSignature",
      );
    });

    it("Should accept signature from new signer after update", async function () {
      await badgeMinter.setSigner(newSigner.address);

      const message = {
        user: user1.address,
        badgeId: BADGE_ID_1,
      };

      const newSignature = await newSigner.signTypedData(domain, types, message);

      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_1, newSignature))
        .to.emit(badgeMinter, "BadgeClaimed")
        .withArgs(user1.address, BADGE_ID_1);
    });

    it("Should prevent non-owner from updating signer", async function () {
      await expect(badgeMinter.connect(user1).setSigner(newSigner.address)).to.be.revertedWithCustomError(
        badgeMinter,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should revert when setting signer to zero address", async function () {
      await expect(badgeMinter.setSigner(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        badgeMinter,
        "InvalidAddress",
      );
    });
  });

  describe("Helper Functions", function () {
    it("Should correctly report claim status via hasUserClaimedBadge", async function () {
      let claimed = await badgeMinter.hasUserClaimedBadge(user1.address, BADGE_ID_1);
      void expect(claimed).to.be.false;

      const message = {
        user: user1.address,
        badgeId: BADGE_ID_1,
      };
      const signature = await signer.signTypedData(domain, types, message);
      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature);

      claimed = await badgeMinter.hasUserClaimedBadge(user1.address, BADGE_ID_1);
      void expect(claimed).to.be.true;
    });

    it("Should return false for unclaimed badges", async function () {
      const claimed1 = await badgeMinter.hasUserClaimedBadge(user1.address, BADGE_ID_1);
      const claimed2 = await badgeMinter.hasUserClaimedBadge(user1.address, BADGE_ID_2);
      void expect(claimed1).to.be.false;
      void expect(claimed2).to.be.false;
    });
  });

  describe("Integration with BadgeToken", function () {
    async function getSignature(user: string, badgeId: number) {
      const message = { user, badgeId };
      return await signer.signTypedData(domain, types, message);
    }

    it("Should fail if BadgeMinter doesn't have MINTER_ROLE", async function () {
      // Deploy new BadgeToken without granting role
      const BadgeToken = await ethers.getContractFactory("BadgeToken");
      const newBadgeToken = await BadgeToken.deploy(BASE_URI);
      await newBadgeToken.waitForDeployment();

      const BadgeMinter = await ethers.getContractFactory("BadgeMinter");
      const newBadgeMinter = await BadgeMinter.deploy(await newBadgeToken.getAddress(), signer.address, owner.address);
      await newBadgeMinter.waitForDeployment();

      const newDomain = {
        name: "BadgeMinter",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await newBadgeMinter.getAddress(),
      };

      const message = {
        user: user1.address,
        badgeId: BADGE_ID_1,
      };

      const signature = await signer.signTypedData(newDomain, types, message);

      // Should fail because BadgeMinter doesn't have MINTER_ROLE
      await expect(newBadgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature)).to.be.reverted;
    });

    it("Should respect BadgeToken soulbound mode", async function () {
      const signature = await getSignature(user1.address, BADGE_ID_1);

      await badgeMinter.connect(user1).claimBadge(BADGE_ID_1, signature);

      // Enable soulbound on BadgeToken
      const ADMIN_ROLE = await badgeToken.ADMIN_ROLE();
      await badgeToken.grantRole(ADMIN_ROLE, owner.address);
      await badgeToken.setSoulbound(true);

      // Transfer should be blocked
      await expect(
        badgeToken.connect(user1).safeTransferFrom(user1.address, user2.address, BADGE_ID_1, 1, "0x"),
      ).to.be.revertedWithCustomError(badgeToken, "TransferBlocked");
    });
  });
});
