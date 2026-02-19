import { expect } from "chai";
import { ethers } from "hardhat";
import { BadgeToken, BadgeMinter, BadgeTemplate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { TypedDataDomain, TypedDataField } from "ethers";

describe("BadgeMinter - Template Badge Claiming", function () {
  let badgeToken: BadgeToken;
  let badgeMinter: BadgeMinter;
  let badgeTemplate: BadgeTemplate;
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let creator: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const BASE_URI = "https://chain-badger.vercel.app/metadata/";
  const METADATA_URI = "ipfs://QmExample123";
  const REQUIREMENTS = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [ethers.ZeroAddress, 100]);

  // EIP-712 Domain and Types for Template Claims
  let domain: TypedDataDomain;
  const templateTypes: Record<string, TypedDataField[]> = {
    TemplateClaim: [
      { name: "user", type: "address" },
      { name: "templateId", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  beforeEach(async function () {
    [owner, signer, creator, user1, user2] = await ethers.getSigners();

    // Deploy BadgeToken
    const BadgeToken = await ethers.getContractFactory("BadgeToken");
    badgeToken = await BadgeToken.deploy(BASE_URI);
    await badgeToken.waitForDeployment();

    // Deploy BadgeMinter
    const BadgeMinter = await ethers.getContractFactory("BadgeMinter");
    badgeMinter = await BadgeMinter.deploy(await badgeToken.getAddress(), signer.address, owner.address);
    await badgeMinter.waitForDeployment();

    // Deploy BadgeTemplate
    const BadgeTemplate = await ethers.getContractFactory("BadgeTemplate");
    badgeTemplate = await BadgeTemplate.deploy(owner.address);
    await badgeTemplate.waitForDeployment();

    // Grant MINTER_ROLE to BadgeMinter
    const MINTER_ROLE = await badgeToken.MINTER_ROLE();
    await badgeToken.grantRole(MINTER_ROLE, await badgeMinter.getAddress());

    // Set BadgeTemplate on BadgeMinter
    await badgeMinter.setBadgeTemplate(await badgeTemplate.getAddress());

    // Set BadgeMinter as authorized minter on BadgeTemplate
    await badgeTemplate.setAuthorizedMinter(await badgeMinter.getAddress());

    // Setup EIP-712 domain
    domain = {
      name: "BadgeMinter",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await badgeMinter.getAddress(),
    };
  });

  describe("Template Integration", function () {
    it("Should allow owner to set BadgeTemplate address", async function () {
      const newTemplate = await (await ethers.getContractFactory("BadgeTemplate")).deploy(owner.address);
      await newTemplate.waitForDeployment();

      await expect(badgeMinter.setBadgeTemplate(await newTemplate.getAddress()))
        .to.emit(badgeMinter, "BadgeTemplateUpdated")
        .withArgs(await newTemplate.getAddress());

      expect(await badgeMinter.badgeTemplate()).to.equal(await newTemplate.getAddress());
    });

    it("Should prevent non-owner from setting BadgeTemplate", async function () {
      const newTemplate = await (await ethers.getContractFactory("BadgeTemplate")).deploy(owner.address);
      await newTemplate.waitForDeployment();

      await expect(
        badgeMinter.connect(user1).setBadgeTemplate(await newTemplate.getAddress()),
      ).to.be.revertedWithCustomError(badgeMinter, "OwnableUnauthorizedAccount");
    });
  });

  describe("Template Badge Claiming - Valid Scenarios", function () {
    let templateId: number;
    let badgeId: number;

    beforeEach(async function () {
      // Create a template
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      templateId = Number(event?.args?.templateId);
      badgeId = Number(event?.args?.badgeId);
    });

    async function getTemplateSignature(user: string, templateId: number, deadline: number) {
      const message = { user, templateId, deadline };
      return await signer.signTypedData(domain, templateTypes, message);
    }

    it("Should mint badge upon successful template claim", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature);

      expect(await badgeToken.balanceOf(user1.address, badgeId)).to.equal(1);
    });

    it("Should emit both BadgeClaimed and TemplateBadgeClaimed events", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature))
        .to.emit(badgeMinter, "BadgeClaimed")
        .withArgs(user1.address, badgeId)
        .to.emit(badgeMinter, "TemplateBadgeClaimed")
        .withArgs(user1.address, templateId, badgeId);
    });

    it("Should mark badge as claimed", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature);

      void expect(await badgeMinter.hasClaimed(user1.address, badgeId)).to.be.true;
    });

    it("Should increment template claim count", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature);

      expect(await badgeTemplate.getTemplateClaimCount(templateId)).to.equal(1);
    });

    it("Should allow different users to claim same template badge", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const sig1 = await getTemplateSignature(user1.address, templateId, deadline);
      const sig2 = await getTemplateSignature(user2.address, templateId, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig1);
      await badgeMinter.connect(user2).claimTemplateBadge(templateId, deadline, sig2);

      expect(await badgeToken.balanceOf(user1.address, badgeId)).to.equal(1);
      expect(await badgeToken.balanceOf(user2.address, badgeId)).to.equal(1);
      expect(await badgeTemplate.getTemplateClaimCount(templateId)).to.equal(2);
    });

    it("Should accept signature before deadline", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour future
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature)).to.not.be.reverted;
    });
  });

  describe("Signature Deadlines", function () {
    let templateId: number;

    beforeEach(async function () {
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      templateId = Number(event?.args?.templateId);
    });

    async function getTemplateSignature(user: string, templateId: number, deadline: number) {
      const message = { user, templateId, deadline };
      return await signer.signTypedData(domain, templateTypes, message);
    }

    it("Should reject expired signature", async function () {
      const deadline = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "SignatureExpired");
    });

    it("Should reject deadline of 0", async function () {
      const deadline = 0;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "SignatureExpired");
    });

    it("Should accept deadline far in the future", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature)).to.not.be.reverted;
    });

    it("Should reject signature with wrong deadline", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const wrongDeadline = deadline + 100;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, wrongDeadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
    });
  });

  describe("Supply Caps", function () {
    async function getTemplateSignature(user: string, templateId: number, deadline: number) {
      const message = { user, templateId, deadline };
      return await signer.signTypedData(domain, templateTypes, message);
    }

    it("Should allow claim under supply cap", async function () {
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 5);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      const templateId = Number(event?.args?.templateId);

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature)).to.not.be.reverted;
    });

    it("Should revert when supply cap reached", async function () {
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 1);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      const templateId = Number(event?.args?.templateId);

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const sig1 = await getTemplateSignature(user1.address, templateId, deadline);
      const sig2 = await getTemplateSignature(user2.address, templateId, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig1);

      await expect(
        badgeMinter.connect(user2).claimTemplateBadge(templateId, deadline, sig2),
      ).to.be.revertedWithCustomError(badgeMinter, "SupplyCapReached");
    });

    it("Should never revert for unlimited supply (maxClaims = 0)", async function () {
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      const templateId = Number(event?.args?.templateId);

      const deadline = Math.floor(Date.now() / 1000) + 600;

      // Claim many times (simulating unlimited)
      for (let i = 0; i < 5; i++) {
        const [newUser] = await ethers.getSigners();
        const sig = await getTemplateSignature(newUser.address, templateId, deadline);
        await expect(badgeMinter.connect(newUser).claimTemplateBadge(templateId, deadline, sig)).to.not.be.reverted;
      }
    });

    it("Should allow exactly one claim for one-of-one (maxClaims = 1)", async function () {
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 1);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      const templateId = Number(event?.args?.templateId);

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const sig1 = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig1)).to.not.be.reverted;

      expect(await badgeTemplate.getTemplateClaimCount(templateId)).to.equal(1);
    });
  });

  describe("Template Validation", function () {
    let templateId: number;

    beforeEach(async function () {
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      templateId = Number(event?.args?.templateId);
    });

    async function getTemplateSignature(user: string, templateId: number, deadline: number) {
      const message = { user, templateId, deadline };
      return await signer.signTypedData(domain, templateTypes, message);
    }

    it("Should revert if template not found", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, 999, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(999, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "TemplateNotFound");
    });

    it("Should revert if template is not active", async function () {
      await badgeTemplate.connect(creator).deactivateTemplate(templateId);

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "TemplateNotActive");
    });

    it("Should revert if template is archived", async function () {
      await badgeTemplate.connect(creator).archiveTemplate(templateId);

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "TemplateNotActive");
    });

    it("Should revert if BadgeTemplate not set", async function () {
      // Deploy new BadgeMinter without setting BadgeTemplate
      const newMinter = await (
        await ethers.getContractFactory("BadgeMinter")
      ).deploy(await badgeToken.getAddress(), signer.address, owner.address);
      await newMinter.waitForDeployment();

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await expect(
        newMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature),
      ).to.be.revertedWithCustomError(newMinter, "BadgeTemplateNotSet");
    });
  });

  describe("Replay Protection", function () {
    let templateId: number;
    let badgeId: number;

    beforeEach(async function () {
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      templateId = Number(event?.args?.templateId);
      badgeId = Number(event?.args?.badgeId);
    });

    async function getTemplateSignature(user: string, templateId: number, deadline: number) {
      const message = { user, templateId, deadline };
      return await signer.signTypedData(domain, templateTypes, message);
    }

    it("Should prevent claiming same badge twice with same signature", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, templateId, deadline);

      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "AlreadyClaimed");
    });

    it("Should prevent claiming even with new signature", async function () {
      const deadline1 = Math.floor(Date.now() / 1000) + 600;
      const deadline2 = Math.floor(Date.now() / 1000) + 700;
      const sig1 = await getTemplateSignature(user1.address, templateId, deadline1);
      const sig2 = await getTemplateSignature(user1.address, templateId, deadline2);

      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline1, sig1);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline2, sig2),
      ).to.be.revertedWithCustomError(badgeMinter, "AlreadyClaimed");
    });
  });

  describe("Backward Compatibility", function () {
    const BADGE_ID_ADMIN = 1;
    const regularTypes: Record<string, TypedDataField[]> = {
      Claim: [
        { name: "user", type: "address" },
        { name: "badgeId", type: "uint256" },
      ],
    };

    it("Should allow existing claimBadge to work", async function () {
      const message = { user: user1.address, badgeId: BADGE_ID_ADMIN };
      const signature = await signer.signTypedData(domain, regularTypes, message);

      await expect(badgeMinter.connect(user1).claimBadge(BADGE_ID_ADMIN, signature))
        .to.emit(badgeMinter, "BadgeClaimed")
        .withArgs(user1.address, BADGE_ID_ADMIN);

      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_ADMIN)).to.equal(1);
    });

    it("Should not interfere between claim paths", async function () {
      // Claim admin badge
      const adminMessage = { user: user1.address, badgeId: BADGE_ID_ADMIN };
      const adminSig = await signer.signTypedData(domain, regularTypes, adminMessage);
      await badgeMinter.connect(user1).claimBadge(BADGE_ID_ADMIN, adminSig);

      // Create and claim template badge
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      const templateId = Number(event?.args?.templateId);

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const templateMessage = { user: user1.address, templateId, deadline };
      const templateSig = await signer.signTypedData(domain, templateTypes, templateMessage);
      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, templateSig);

      // Both should succeed
      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_ADMIN)).to.equal(1);
      expect(await badgeToken.balanceOf(user1.address, 1000)).to.equal(1);
    });
  });

  describe("EIP-712 Template Signatures", function () {
    let templateId: number;

    beforeEach(async function () {
      const tx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      templateId = Number(event?.args?.templateId);
    });

    async function getTemplateSignature(user: string, templateId: number, deadline: number) {
      const message = { user, templateId, deadline };
      return await signer.signTypedData(domain, templateTypes, message);
    }

    it("Should generate correct template claim digest", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const digest = await badgeMinter.getTemplateClaimDigest(user1.address, templateId, deadline);

      expect(digest).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should reject signature with wrong templateId", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user1.address, 999, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
    });

    it("Should reject signature for wrong user", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const signature = await getTemplateSignature(user2.address, templateId, deadline);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
    });

    it("Should reject signature from unauthorized signer", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const message = { user: user1.address, templateId, deadline };
      const badSignature = await user2.signTypedData(domain, templateTypes, message);

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, badSignature),
      ).to.be.revertedWithCustomError(badgeMinter, "InvalidSignature");
    });
  });
});
