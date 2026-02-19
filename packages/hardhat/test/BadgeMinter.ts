import { expect } from "chai";
import { ethers } from "hardhat";
import { BadgeToken, BadgeMinter, BadgeTemplate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { TypedDataDomain, TypedDataField } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BadgeMinter", function () {
  let badgeToken: BadgeToken;
  let badgeMinter: BadgeMinter;
  let badgeTemplate: BadgeTemplate;
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let newSigner: SignerWithAddress;

  const BASE_URI = "https://chain-badger.vercel.app/metadata/";
  const METADATA_URI = "ipfs://QmBadge1";

  // Helper: ABI-encode minimal requirements bytes
  const encodeRequirements = (token = ethers.ZeroAddress, minBalance = 0n, minXP = 0n, mustFollowCreator = false) =>
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256", "bool"],
      [token, minBalance, minXP, mustFollowCreator],
    );

  const EMPTY_REQUIREMENTS = encodeRequirements();

  // EIP-712 Domain and Types for TemplateClaim
  let domain: TypedDataDomain;
  const templateClaimTypes: Record<string, TypedDataField[]> = {
    TemplateClaim: [
      { name: "user", type: "address" },
      { name: "templateId", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  // Helper: create a future deadline relative to the current chain timestamp
  const futureDeadline = async () => BigInt((await time.latest()) + 600);

  // Helper: sign a TemplateClaim EIP-712 message
  const signTemplateClaim = async (
    signerAccount: SignerWithAddress,
    user: string,
    templateId: bigint,
    deadline: bigint,
  ) => {
    const message = { user, templateId, deadline };
    return signerAccount.signTypedData(domain, templateClaimTypes, message);
  };

  beforeEach(async function () {
    [owner, signer, user1, user2, newSigner] = await ethers.getSigners();

    // Deploy BadgeToken
    const BadgeTokenFactory = await ethers.getContractFactory("BadgeToken");
    badgeToken = await BadgeTokenFactory.deploy(BASE_URI);
    await badgeToken.waitForDeployment();

    // Deploy BadgeTemplate
    const BadgeTemplateFactory = await ethers.getContractFactory("BadgeTemplate");
    badgeTemplate = await BadgeTemplateFactory.deploy(owner.address);
    await badgeTemplate.waitForDeployment();

    // Deploy BadgeMinter
    const BadgeMinterFactory = await ethers.getContractFactory("BadgeMinter");
    badgeMinter = await BadgeMinterFactory.deploy(await badgeToken.getAddress(), signer.address, owner.address);
    await badgeMinter.waitForDeployment();

    // Grant MINTER_ROLE to BadgeMinter
    const MINTER_ROLE = await badgeToken.MINTER_ROLE();
    await badgeToken.grantRole(MINTER_ROLE, await badgeMinter.getAddress());

    // Link BadgeMinter ↔ BadgeTemplate
    await badgeMinter.connect(owner).setBadgeTemplate(await badgeTemplate.getAddress());
    await badgeTemplate.connect(owner).setAuthorizedMinter(await badgeMinter.getAddress());

    // Create a template (templateId = 0, badgeId = 1)
    await badgeTemplate.connect(user1).createTemplate(METADATA_URI, EMPTY_REQUIREMENTS, 0n);

    // Setup EIP-712 domain
    domain = {
      name: "BadgeMinter",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await badgeMinter.getAddress(),
    };
  });

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------

  describe("Deployment", function () {
    it("Should set the correct BadgeToken address", async function () {
      expect(await badgeMinter.badgeToken()).to.equal(await badgeToken.getAddress());
    });

    it("Should set the correct signer address", async function () {
      expect(await badgeMinter.getFunction("signer")()).to.equal(signer.address);
    });

    it("Should set the correct owner", async function () {
      expect(await badgeMinter.owner()).to.equal(owner.address);
    });

    it("Should revert if BadgeToken address is zero", async function () {
      const BadgeMinterFactory = await ethers.getContractFactory("BadgeMinter");
      await expect(
        BadgeMinterFactory.deploy(ethers.ZeroAddress, signer.address, owner.address),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidAddress");
    });

    it("Should revert if signer address is zero", async function () {
      const BadgeMinterFactory = await ethers.getContractFactory("BadgeMinter");
      await expect(
        BadgeMinterFactory.deploy(await badgeToken.getAddress(), ethers.ZeroAddress, owner.address),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidAddress");
    });

    it("Should start with BadgeTemplate address unset when freshly deployed", async function () {
      const BadgeMinterFactory = await ethers.getContractFactory("BadgeMinter");
      const freshMinter = await BadgeMinterFactory.deploy(await badgeToken.getAddress(), signer.address, owner.address);
      await freshMinter.waitForDeployment();
      expect(await freshMinter.badgeTemplate()).to.equal(ethers.ZeroAddress);
    });
  });

  // ---------------------------------------------------------------------------
  // Template Integration (setBadgeTemplate)
  // ---------------------------------------------------------------------------

  describe("Template Integration", function () {
    it("Should allow owner to set BadgeTemplate reference", async function () {
      expect(await badgeMinter.badgeTemplate()).to.equal(await badgeTemplate.getAddress());
    });

    it("Should emit BadgeTemplateUpdated event", async function () {
      const BadgeMinterFactory = await ethers.getContractFactory("BadgeMinter");
      const freshMinter = await BadgeMinterFactory.deploy(await badgeToken.getAddress(), signer.address, owner.address);
      await freshMinter.waitForDeployment();
      await expect(freshMinter.connect(owner).setBadgeTemplate(await badgeTemplate.getAddress()))
        .to.emit(freshMinter, "BadgeTemplateUpdated")
        .withArgs(await badgeTemplate.getAddress());
    });

    it("Should revert when non-owner tries to set BadgeTemplate", async function () {
      await expect(
        badgeMinter.connect(user1).setBadgeTemplate(await badgeTemplate.getAddress()),
      ).to.be.revertedWithCustomError(badgeMinter, "OwnableUnauthorizedAccount");
    });

    it("Should revert when setting BadgeTemplate to zero address", async function () {
      await expect(badgeMinter.connect(owner).setBadgeTemplate(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        badgeMinter,
        "InvalidAddress",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Template Claiming — Happy Path
  // ---------------------------------------------------------------------------

  describe("Template Claiming", function () {
    it("Should mint the correct badge to the user", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature);

      // templateId 0 → badgeId 1
      expect(await badgeToken.balanceOf(user1.address, 1n)).to.equal(1n);
    });

    it("Should emit BadgeClaimed event", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature))
        .to.emit(badgeMinter, "BadgeClaimed")
        .withArgs(user1.address, 1n);
    });

    it("Should emit TemplateBadgeClaimed event", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature))
        .to.emit(badgeMinter, "TemplateBadgeClaimed")
        .withArgs(user1.address, 0n, 1n);
    });

    it("Should mark the badge as claimed for the user", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature);

      expect(await badgeMinter.hasClaimed(user1.address, 1n)).to.be.true;
    });

    it("Should increment templateClaimCount on BadgeTemplate", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature);

      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(1n);
    });

    it("Should allow different users to claim the same template badge", async function () {
      const deadline = await futureDeadline();
      const sig1 = await signTemplateClaim(signer, user1.address, 0n, deadline);
      const sig2 = await signTemplateClaim(signer, user2.address, 0n, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, sig1);
      await badgeMinter.connect(user2).claimTemplateBadge(0n, deadline, sig2);

      expect(await badgeToken.balanceOf(user1.address, 1n)).to.equal(1n);
      expect(await badgeToken.balanceOf(user2.address, 1n)).to.equal(1n);
      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(2n);
    });
  });

  // ---------------------------------------------------------------------------
  // Replay Protection
  // ---------------------------------------------------------------------------

  describe("Replay Protection", function () {
    it("Should prevent claiming the same badge twice with the same signature", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "AlreadyClaimed");
    });

    it("Should prevent claiming even with a fresh signature for the same badge", async function () {
      const deadline1 = await futureDeadline();
      const deadline2 = await futureDeadline();
      const sig1 = await signTemplateClaim(signer, user1.address, 0n, deadline1);
      const sig2 = await signTemplateClaim(signer, user1.address, 0n, deadline2);

      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline1, sig1);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline2, sig2)).to.be.revertedWithCustomError(
        badgeMinter,
        "AlreadyClaimed",
      );
    });

    it("Should track claims independently per badge ID", async function () {
      // Create a second template (templateId = 1, badgeId = 2)
      await badgeTemplate.connect(user1).createTemplate("ipfs://QmBadge2", EMPTY_REQUIREMENTS, 0n);

      const deadline = await futureDeadline();
      const sig1 = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, sig1);

      expect(await badgeMinter.hasClaimed(user1.address, 1n)).to.be.true;
      expect(await badgeMinter.hasClaimed(user1.address, 2n)).to.be.false;

      // Can still claim template 1 (badgeId 2)
      const sig2 = await signTemplateClaim(signer, user1.address, 1n, deadline);
      await expect(badgeMinter.connect(user1).claimTemplateBadge(1n, deadline, sig2)).to.not.be.reverted;
    });

    it("Should track claims independently per user", async function () {
      const deadline = await futureDeadline();
      const sig1 = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, sig1);

      expect(await badgeMinter.hasClaimed(user1.address, 1n)).to.be.true;
      expect(await badgeMinter.hasClaimed(user2.address, 1n)).to.be.false;

      // user2 can still claim the same template
      const sig2 = await signTemplateClaim(signer, user2.address, 0n, deadline);
      await expect(badgeMinter.connect(user2).claimTemplateBadge(0n, deadline, sig2)).to.not.be.reverted;
    });
  });

  // ---------------------------------------------------------------------------
  // Signature Deadlines
  // ---------------------------------------------------------------------------

  describe("Signature Deadlines", function () {
    it("Should accept a signature with a future deadline", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature)).to.not.be.reverted;
    });

    it("Should reject an expired signature", async function () {
      const pastDeadline = BigInt((await time.latest()) - 60);
      const signature = await signTemplateClaim(signer, user1.address, 0n, pastDeadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(0n, pastDeadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "SignatureExpired");
    });

    it("Should reject a signature with deadline = 0", async function () {
      const signature = await signTemplateClaim(signer, user1.address, 0n, 0n);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, 0n, signature)).to.be.revertedWithCustomError(
        badgeMinter,
        "SignatureExpired",
      );
    });

    it("Should accept a signature with a deadline far in the future", async function () {
      const farDeadline = BigInt((await time.latest()) + 86400 * 365);
      const signature = await signTemplateClaim(signer, user1.address, 0n, farDeadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, farDeadline, signature)).to.not.be.reverted;
    });

    it("Should reject a signature after deadline passes via time manipulation", async function () {
      const deadline = BigInt((await time.latest()) + 300);
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      // Advance time past deadline
      await time.increaseTo(Number(deadline) + 1);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "SignatureExpired");
    });
  });

  // ---------------------------------------------------------------------------
  // Supply Caps
  // ---------------------------------------------------------------------------

  describe("Supply Caps", function () {
    it("Should allow claiming for unlimited supply (maxClaims = 0)", async function () {
      const deadline = await futureDeadline();
      const sig = await signTemplateClaim(signer, user1.address, 0n, deadline);
      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, sig)).to.not.be.reverted;
    });

    it("Should revert with SupplyCapReached when cap is exhausted", async function () {
      // Create a template with maxClaims = 1 (templateId = 1)
      await badgeTemplate.connect(user1).createTemplate("ipfs://QmCapped", EMPTY_REQUIREMENTS, 1n);
      const templateId = 1n;

      const deadline = await futureDeadline();
      const sig1 = await signTemplateClaim(signer, user1.address, templateId, deadline);
      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig1);

      const sig2 = await signTemplateClaim(signer, user2.address, templateId, deadline);
      await expect(
        badgeMinter.connect(user2).claimTemplateBadge(templateId, deadline, sig2),
      ).to.be.revertedWithCustomError(badgeMinter, "SupplyCapReached");
    });

    it("Should allow exactly one claim for one-of-one (maxClaims = 1)", async function () {
      await badgeTemplate.connect(user1).createTemplate("ipfs://QmOneOfOne", EMPTY_REQUIREMENTS, 1n);
      const templateId = 1n;

      const deadline = await futureDeadline();
      const sig = await signTemplateClaim(signer, user1.address, templateId, deadline);
      await expect(badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig)).to.not.be.reverted;
    });

    it("Should allow claiming up to the supply cap", async function () {
      await badgeTemplate.connect(user1).createTemplate("ipfs://QmTwo", EMPTY_REQUIREMENTS, 2n);
      const templateId = 1n;

      const deadline = await futureDeadline();
      const sig1 = await signTemplateClaim(signer, user1.address, templateId, deadline);
      const sig2 = await signTemplateClaim(signer, user2.address, templateId, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig1);
      await badgeMinter.connect(user2).claimTemplateBadge(templateId, deadline, sig2);

      expect(await badgeTemplate.getTemplateClaimCount(templateId)).to.equal(2n);
    });
  });

  // ---------------------------------------------------------------------------
  // Template Validation
  // ---------------------------------------------------------------------------

  describe("Template Validation", function () {
    it("Should revert with BadgeTemplateNotSet if BadgeTemplate is not configured", async function () {
      const BadgeMinterFactory = await ethers.getContractFactory("BadgeMinter");
      const freshMinter = await BadgeMinterFactory.deploy(await badgeToken.getAddress(), signer.address, owner.address);
      await freshMinter.waitForDeployment();

      const MINTER_ROLE = await badgeToken.MINTER_ROLE();
      await badgeToken.grantRole(MINTER_ROLE, await freshMinter.getAddress());

      const freshDomain: TypedDataDomain = {
        name: "BadgeMinter",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await freshMinter.getAddress(),
      };

      const deadline = await futureDeadline();
      const sig = await signer.signTypedData(freshDomain, templateClaimTypes, {
        user: user1.address,
        templateId: 0n,
        deadline,
      });

      await expect(freshMinter.connect(user1).claimTemplateBadge(0n, deadline, sig)).to.be.revertedWithCustomError(
        freshMinter,
        "BadgeTemplateNotSet",
      );
    });

    it("Should revert with TemplateNotFound for a non-existent template", async function () {
      const deadline = await futureDeadline();
      const sig = await signTemplateClaim(signer, user1.address, 99n, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(99n, deadline, sig)).to.be.revertedWithCustomError(
        badgeMinter,
        "TemplateNotFound",
      );
    });

    it("Should revert with TemplateNotActive for a deactivated template", async function () {
      await badgeTemplate.connect(user1).deactivateTemplate(0n);

      const deadline = await futureDeadline();
      const sig = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, sig)).to.be.revertedWithCustomError(
        badgeMinter,
        "TemplateNotActive",
      );
    });

    it("Should revert with TemplateNotActive for an archived template", async function () {
      await badgeTemplate.connect(user1).archiveTemplate(0n);

      const deadline = await futureDeadline();
      const sig = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, sig)).to.be.revertedWithCustomError(
        badgeMinter,
        "TemplateNotActive",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EIP-712 Template Signatures
  // ---------------------------------------------------------------------------

  describe("EIP-712 Template Signatures", function () {
    it("Should generate a valid domain separator", async function () {
      const domainSeparator = await badgeMinter.getDomainSeparator();
      expect(domainSeparator).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should generate a correct TemplateClaim digest via getTemplateClaimDigest", async function () {
      const deadline = await futureDeadline();
      const digest = await badgeMinter.getTemplateClaimDigest(user1.address, 0n, deadline);
      expect(digest).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should accept a valid EIP-712 TemplateClaim signature", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 0n, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature)).to.not.be.reverted;
    });

    it("Should reject a signature signed by an unauthorized signer", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(user2, user1.address, 0n, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
    });

    it("Should reject a signature for the wrong user", async function () {
      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user2.address, 0n, deadline);

      // user1 submits user2's signature
      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
    });

    it("Should reject a signature for the wrong templateId", async function () {
      await badgeTemplate.connect(user1).createTemplate("ipfs://QmOther", EMPTY_REQUIREMENTS, 0n);

      const deadline = await futureDeadline();
      const signature = await signTemplateClaim(signer, user1.address, 1n, deadline);

      // user1 tries to claim template 0 with template 1's signature
      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
    });

    it("Should reject a signature with the wrong deadline", async function () {
      const correctDeadline = await futureDeadline();
      const wrongDeadline = correctDeadline + 100n;
      const signature = await signTemplateClaim(signer, user1.address, 0n, correctDeadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(0n, wrongDeadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
    });

    it("Should reject a malformed / truncated signature", async function () {
      const deadline = await futureDeadline();
      await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, "0x1234")).to.be.reverted;
    });
  });

  // ---------------------------------------------------------------------------
  // Admin Functions
  // ---------------------------------------------------------------------------

  describe("Admin Functions", function () {
    describe("setSigner", function () {
      it("Should allow owner to update signer", async function () {
        await badgeMinter.connect(owner).setSigner(newSigner.address);
        expect(await badgeMinter.getFunction("signer")()).to.equal(newSigner.address);
      });

      it("Should emit SignerUpdated event", async function () {
        await expect(badgeMinter.connect(owner).setSigner(newSigner.address))
          .to.emit(badgeMinter, "SignerUpdated")
          .withArgs(signer.address, newSigner.address);
      });

      it("Should prevent non-owner from updating signer", async function () {
        await expect(badgeMinter.connect(user1).setSigner(newSigner.address)).to.be.revertedWithCustomError(
          badgeMinter,
          "OwnableUnauthorizedAccount",
        );
      });

      it("Should revert when setting signer to zero address", async function () {
        await expect(badgeMinter.connect(owner).setSigner(ethers.ZeroAddress)).to.be.revertedWithCustomError(
          badgeMinter,
          "InvalidAddress",
        );
      });

      it("Should reject claims signed by the old signer after an update", async function () {
        const deadline = await futureDeadline();
        const oldSignature = await signTemplateClaim(signer, user1.address, 0n, deadline);

        await badgeMinter.connect(owner).setSigner(newSigner.address);

        await expect(
          badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, oldSignature),
        ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
      });

      it("Should accept claims signed by the new signer after an update", async function () {
        await badgeMinter.connect(owner).setSigner(newSigner.address);

        const deadline = await futureDeadline();
        const newSignature = await signTemplateClaim(newSigner, user1.address, 0n, deadline);

        await expect(badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, newSignature)).to.not.be.reverted;
      });
    });
  });

  // ---------------------------------------------------------------------------
  // View Helpers
  // ---------------------------------------------------------------------------

  describe("View Helpers", function () {
    it("hasUserClaimedBadge should return false before a claim", async function () {
      expect(await badgeMinter.hasUserClaimedBadge(user1.address, 1n)).to.be.false;
    });

    it("hasUserClaimedBadge should return true after a claim", async function () {
      const deadline = await futureDeadline();
      const sig = await signTemplateClaim(signer, user1.address, 0n, deadline);
      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, sig);

      expect(await badgeMinter.hasUserClaimedBadge(user1.address, 1n)).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // Integration with BadgeToken
  // ---------------------------------------------------------------------------

  describe("Integration with BadgeToken", function () {
    it("Should fail if BadgeMinter does not have MINTER_ROLE", async function () {
      const BadgeTokenFactory = await ethers.getContractFactory("BadgeToken");
      const newToken = await BadgeTokenFactory.deploy(BASE_URI);
      await newToken.waitForDeployment();

      const BadgeMinterFactory = await ethers.getContractFactory("BadgeMinter");
      const newMinter = await BadgeMinterFactory.deploy(await newToken.getAddress(), signer.address, owner.address);
      await newMinter.waitForDeployment();

      await newMinter.connect(owner).setBadgeTemplate(await badgeTemplate.getAddress());
      await badgeTemplate.connect(owner).setAuthorizedMinter(await newMinter.getAddress());

      const newDomain: TypedDataDomain = {
        name: "BadgeMinter",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await newMinter.getAddress(),
      };

      const deadline = await futureDeadline();
      const sig = await signer.signTypedData(newDomain, templateClaimTypes, {
        user: user1.address,
        templateId: 0n,
        deadline,
      });

      // Should fail because newMinter doesn't have MINTER_ROLE on newToken
      await expect(newMinter.connect(user1).claimTemplateBadge(0n, deadline, sig)).to.be.reverted;
    });

    it("Should respect BadgeToken soulbound mode after minting", async function () {
      const deadline = await futureDeadline();
      const sig = await signTemplateClaim(signer, user1.address, 0n, deadline);
      await badgeMinter.connect(user1).claimTemplateBadge(0n, deadline, sig);

      const ADMIN_ROLE = await badgeToken.ADMIN_ROLE();
      await badgeToken.grantRole(ADMIN_ROLE, owner.address);
      await badgeToken.setSoulbound(true);

      await expect(
        badgeToken.connect(user1).safeTransferFrom(user1.address, user2.address, 1n, 1n, "0x"),
      ).to.be.revertedWithCustomError(badgeToken, "TransferBlocked");
    });
  });
});
