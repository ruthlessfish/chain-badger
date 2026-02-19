import { expect } from "chai";
import { ethers } from "hardhat";
import { BadgeTemplate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BadgeTemplate", function () {
  let badgeTemplate: BadgeTemplate;
  let owner: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let minter: SignerWithAddress;
  let user1: SignerWithAddress;

  const METADATA_URI = "ipfs://QmExample123";
  const REQUIREMENTS = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [ethers.ZeroAddress, 100]);

  beforeEach(async function () {
    [owner, creator1, creator2, minter, user1] = await ethers.getSigners();

    // Deploy BadgeTemplate
    const BadgeTemplate = await ethers.getContractFactory("BadgeTemplate");
    badgeTemplate = await BadgeTemplate.deploy(owner.address);
    await badgeTemplate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await badgeTemplate.owner()).to.equal(owner.address);
    });

    it("Should initialize nextTemplateId to 0", async function () {
      expect(await badgeTemplate.nextTemplateId()).to.equal(0);
    });

    it("Should initialize nextBadgeId to 1000", async function () {
      expect(await badgeTemplate.nextBadgeId()).to.equal(1000);
    });

    it("Should have correct constants", async function () {
      expect(await badgeTemplate.TEMPLATE_BADGE_ID_START()).to.equal(1000);
      expect(await badgeTemplate.CURRENT_TEMPLATE_VERSION()).to.equal(1);
    });
  });

  describe("Template Creation", function () {
    it("Should allow anyone to create a template", async function () {
      await expect(badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100)).to.not.be.reverted;
    });

    it("Should auto-assign template ID and badge ID", async function () {
      const tx = await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      void expect(event).to.not.be.undefined;
      expect(event?.args?.templateId).to.equal(0);
      expect(event?.args?.badgeId).to.equal(1000);
    });

    it("Should increment IDs for multiple templates", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100);
      const tx2 = await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 200);
      const receipt2 = await tx2.wait();

      const event2 = receipt2?.logs.find((log: any) => log.eventName === "TemplateCreated");
      expect(event2?.args?.templateId).to.equal(1);
      expect(event2?.args?.badgeId).to.equal(1001);
    });

    it("Should emit TemplateCreated event with all details", async function () {
      const reqHash = ethers.keccak256(REQUIREMENTS);

      await expect(badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100))
        .to.emit(badgeTemplate, "TemplateCreated")
        .withArgs(
          0, // templateId
          1000, // badgeId
          creator1.address, // creator
          METADATA_URI,
          reqHash,
          100, // maxClaims
          1, // templateVersion
        );
    });

    it("Should store all template fields correctly", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100);

      const template = await badgeTemplate.getTemplate(0);
      expect(template.creator).to.equal(creator1.address);
      expect(template.badgeId).to.equal(1000);
      expect(template.metadataURI).to.equal(METADATA_URI);
      expect(template.requirements).to.equal(REQUIREMENTS);
      expect(template.requirementsHash).to.equal(ethers.keccak256(REQUIREMENTS));
      expect(template.templateVersion).to.equal(1);
      expect(template.maxClaims).to.equal(100);
      void expect(template.active).to.be.true;
      void expect(template.archived).to.be.false;
    });

    it("Should track templates by creator", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      await badgeTemplate.connect(creator2).createTemplate(METADATA_URI, REQUIREMENTS, 0);

      const creator1Templates = await badgeTemplate.getTemplatesByCreator(creator1.address);
      const creator2Templates = await badgeTemplate.getTemplatesByCreator(creator2.address);

      expect(creator1Templates.length).to.equal(2);
      expect(creator1Templates[0]).to.equal(0);
      expect(creator1Templates[1]).to.equal(1);
      expect(creator2Templates.length).to.equal(1);
      expect(creator2Templates[0]).to.equal(2);
    });

    it("Should revert if metadata URI is empty", async function () {
      await expect(badgeTemplate.connect(creator1).createTemplate("", REQUIREMENTS, 0)).to.be.revertedWithCustomError(
        badgeTemplate,
        "EmptyMetadataURI",
      );
    });

    it("Should allow maxClaims of 0 (unlimited)", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 0);

      const template = await badgeTemplate.getTemplate(0);
      expect(template.maxClaims).to.equal(0);
    });

    it("Should allow maxClaims of 1 (one-of-one)", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 1);

      const template = await badgeTemplate.getTemplate(0);
      expect(template.maxClaims).to.equal(1);
    });
  });

  describe("Template Management", function () {
    beforeEach(async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100);
    });

    it("Should allow creator to deactivate template", async function () {
      await expect(badgeTemplate.connect(creator1).deactivateTemplate(0))
        .to.emit(badgeTemplate, "TemplateDeactivated")
        .withArgs(0);

      const template = await badgeTemplate.getTemplate(0);
      void expect(template.active).to.be.false;
    });

    it("Should allow creator to reactivate template", async function () {
      await badgeTemplate.connect(creator1).deactivateTemplate(0);

      await expect(badgeTemplate.connect(creator1).reactivateTemplate(0))
        .to.emit(badgeTemplate, "TemplateReactivated")
        .withArgs(0);

      const template = await badgeTemplate.getTemplate(0);
      void expect(template.active).to.be.true;
    });

    it("Should prevent non-creator from deactivating", async function () {
      await expect(badgeTemplate.connect(creator2).deactivateTemplate(0)).to.be.revertedWithCustomError(
        badgeTemplate,
        "NotTemplateCreator",
      );
    });

    it("Should prevent non-creator from reactivating", async function () {
      await badgeTemplate.connect(creator1).deactivateTemplate(0);

      await expect(badgeTemplate.connect(creator2).reactivateTemplate(0)).to.be.revertedWithCustomError(
        badgeTemplate,
        "NotTemplateCreator",
      );
    });

    it("Should allow creator to archive template", async function () {
      await expect(badgeTemplate.connect(creator1).archiveTemplate(0))
        .to.emit(badgeTemplate, "TemplateArchived")
        .withArgs(0);

      const template = await badgeTemplate.getTemplate(0);
      void expect(template.archived).to.be.true;
      void expect(template.active).to.be.false;
    });

    it("Should prevent archived template from being reactivated", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0);

      await expect(badgeTemplate.connect(creator1).reactivateTemplate(0)).to.be.revertedWithCustomError(
        badgeTemplate,
        "TemplateArchived",
      );
    });

    it("Should prevent archived template from being deactivated", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0);

      await expect(badgeTemplate.connect(creator1).deactivateTemplate(0)).to.be.revertedWithCustomError(
        badgeTemplate,
        "TemplateArchived",
      );
    });
  });

  describe("Requirements and Metadata Updates", function () {
    beforeEach(async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100);
    });

    it("Should allow creator to update requirements", async function () {
      const newRequirements = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [creator1.address, 200]);
      const newHash = ethers.keccak256(newRequirements);

      await expect(badgeTemplate.connect(creator1).updateRequirements(0, newRequirements))
        .to.emit(badgeTemplate, "RequirementsUpdated")
        .withArgs(0, newHash);

      const template = await badgeTemplate.getTemplate(0);
      expect(template.requirements).to.equal(newRequirements);
      expect(template.requirementsHash).to.equal(newHash);
    });

    it("Should allow creator to update metadata URI", async function () {
      const newURI = "ipfs://QmNewExample456";

      await expect(badgeTemplate.connect(creator1).updateMetadataURI(0, newURI))
        .to.emit(badgeTemplate, "MetadataURIUpdated")
        .withArgs(0, newURI);

      const template = await badgeTemplate.getTemplate(0);
      expect(template.metadataURI).to.equal(newURI);
    });

    it("Should prevent non-creator from updating requirements", async function () {
      const newRequirements = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [creator2.address, 200]);

      await expect(
        badgeTemplate.connect(creator2).updateRequirements(0, newRequirements),
      ).to.be.revertedWithCustomError(badgeTemplate, "NotTemplateCreator");
    });

    it("Should prevent non-creator from updating metadata URI", async function () {
      await expect(badgeTemplate.connect(creator2).updateMetadataURI(0, "ipfs://QmNew")).to.be.revertedWithCustomError(
        badgeTemplate,
        "NotTemplateCreator",
      );
    });

    it("Should prevent updating archived template requirements", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0);

      const newRequirements = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [creator1.address, 200]);

      await expect(
        badgeTemplate.connect(creator1).updateRequirements(0, newRequirements),
      ).to.be.revertedWithCustomError(badgeTemplate, "TemplateArchived");
    });

    it("Should prevent updating archived template metadata URI", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0);

      await expect(badgeTemplate.connect(creator1).updateMetadataURI(0, "ipfs://QmNew")).to.be.revertedWithCustomError(
        badgeTemplate,
        "TemplateArchived",
      );
    });

    it("Should revert if new metadata URI is empty", async function () {
      await expect(badgeTemplate.connect(creator1).updateMetadataURI(0, "")).to.be.revertedWithCustomError(
        badgeTemplate,
        "EmptyMetadataURI",
      );
    });
  });

  describe("Claim Count Management", function () {
    beforeEach(async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100);
      await badgeTemplate.setAuthorizedMinter(minter.address);
    });

    it("Should allow authorized minter to increment claim count", async function () {
      await expect(badgeTemplate.connect(minter).incrementClaimCount(0))
        .to.emit(badgeTemplate, "TemplateClaimCountIncremented")
        .withArgs(0, 1);

      expect(await badgeTemplate.getTemplateClaimCount(0)).to.equal(1);
    });

    it("Should increment claim count multiple times", async function () {
      await badgeTemplate.connect(minter).incrementClaimCount(0);
      await badgeTemplate.connect(minter).incrementClaimCount(0);
      await badgeTemplate.connect(minter).incrementClaimCount(0);

      expect(await badgeTemplate.getTemplateClaimCount(0)).to.equal(3);
    });

    it("Should prevent non-minter from incrementing claim count", async function () {
      await expect(badgeTemplate.connect(user1).incrementClaimCount(0)).to.be.revertedWithCustomError(
        badgeTemplate,
        "NotAuthorizedMinter",
      );
    });

    it("Should return 0 for unclaimed template", async function () {
      expect(await badgeTemplate.getTemplateClaimCount(0)).to.equal(0);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 100);
    });

    it("Should return template exists for created template", async function () {
      void expect(await badgeTemplate.templateExists(0)).to.be.true;
    });

    it("Should return template does not exist for non-existent template", async function () {
      void expect(await badgeTemplate.templateExists(99)).to.be.false;
    });

    it("Should return isTemplateActive true for active template", async function () {
      void expect(await badgeTemplate.isTemplateActive(0)).to.be.true;
    });

    it("Should return isTemplateActive false for deactivated template", async function () {
      await badgeTemplate.connect(creator1).deactivateTemplate(0);
      void expect(await badgeTemplate.isTemplateActive(0)).to.be.false;
    });

    it("Should return isTemplateActive false for archived template", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0);
      void expect(await badgeTemplate.isTemplateActive(0)).to.be.false;
    });

    it("Should return isTemplateArchived correctly", async function () {
      void expect(await badgeTemplate.isTemplateArchived(0)).to.be.false;

      await badgeTemplate.connect(creator1).archiveTemplate(0);
      void expect(await badgeTemplate.isTemplateArchived(0)).to.be.true;
    });

    it("Should return isTemplateClaimable true for active unlimited template", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 0);
      void expect(await badgeTemplate.isTemplateClaimable(1)).to.be.true;
    });

    it("Should return isTemplateClaimable true when under supply cap", async function () {
      await badgeTemplate.setAuthorizedMinter(minter.address);
      await badgeTemplate.connect(minter).incrementClaimCount(0);

      void expect(await badgeTemplate.isTemplateClaimable(0)).to.be.true;
    });

    it("Should return isTemplateClaimable false when supply cap reached", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 1);
      await badgeTemplate.setAuthorizedMinter(minter.address);
      await badgeTemplate.connect(minter).incrementClaimCount(1);

      void expect(await badgeTemplate.isTemplateClaimable(1)).to.be.false;
    });

    it("Should return isTemplateClaimable false for inactive template", async function () {
      await badgeTemplate.connect(creator1).deactivateTemplate(0);
      void expect(await badgeTemplate.isTemplateClaimable(0)).to.be.false;
    });

    it("Should return isTemplateClaimable false for archived template", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0);
      void expect(await badgeTemplate.isTemplateClaimable(0)).to.be.false;
    });

    it("Should revert getTemplate for non-existent template", async function () {
      await expect(badgeTemplate.getTemplate(99)).to.be.revertedWithCustomError(badgeTemplate, "TemplateNotFound");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set authorized minter", async function () {
      await expect(badgeTemplate.setAuthorizedMinter(minter.address))
        .to.emit(badgeTemplate, "AuthorizedMinterUpdated")
        .withArgs(ethers.ZeroAddress, minter.address);

      expect(await badgeTemplate.authorizedMinter()).to.equal(minter.address);
    });

    it("Should prevent non-owner from setting authorized minter", async function () {
      await expect(badgeTemplate.connect(user1).setAuthorizedMinter(minter.address)).to.be.revertedWithCustomError(
        badgeTemplate,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very large requirements bytes", async function () {
      const largeRequirements = ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["x".repeat(1000)]);

      await expect(badgeTemplate.connect(creator1).createTemplate(METADATA_URI, largeRequirements, 0)).to.not.be
        .reverted;
    });

    it("Should correctly calculate requirementsHash", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 0);

      const template = await badgeTemplate.getTemplate(0);
      const expectedHash = ethers.keccak256(REQUIREMENTS);

      expect(template.requirementsHash).to.equal(expectedHash);
    });

    it("Should handle template at ID 0", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI, REQUIREMENTS, 0);

      const template = await badgeTemplate.getTemplate(0);
      expect(template.creator).to.equal(creator1.address);
    });
  });
});
