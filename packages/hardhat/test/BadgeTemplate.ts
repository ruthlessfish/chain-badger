import { expect } from "chai";
import { ethers } from "hardhat";
import { BadgeTemplate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BadgeTemplate", function () {
  let badgeTemplate: BadgeTemplate;
  let owner: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let user1: SignerWithAddress;
  let authorizedMinter: SignerWithAddress;

  const METADATA_URI_1 = "ipfs://QmBadge1";
  const METADATA_URI_2 = "ipfs://QmBadge2";

  // Helper: ABI-encode minimal requirements bytes
  const encodeRequirements = (token = ethers.ZeroAddress, minBalance = 0n, minXP = 0n, mustFollowCreator = false) =>
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256", "bool"],
      [token, minBalance, minXP, mustFollowCreator],
    );

  const EMPTY_REQUIREMENTS = encodeRequirements();

  beforeEach(async function () {
    [owner, creator1, creator2, user1, authorizedMinter] = await ethers.getSigners();

    const BadgeTemplateFactory = await ethers.getContractFactory("BadgeTemplate");
    badgeTemplate = await BadgeTemplateFactory.deploy(owner.address);
    await badgeTemplate.waitForDeployment();
  });

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await badgeTemplate.owner()).to.equal(owner.address);
    });

    it("Should start with nextTemplateId = 0", async function () {
      expect(await badgeTemplate.nextTemplateId()).to.equal(0n);
    });

    it("Should start with nextBadgeId = 1", async function () {
      expect(await badgeTemplate.nextBadgeId()).to.equal(1n);
    });

    it("Should have CURRENT_TEMPLATE_VERSION = 1", async function () {
      expect(await badgeTemplate.CURRENT_TEMPLATE_VERSION()).to.equal(1);
    });

    it("Should start with no authorized minter", async function () {
      expect(await badgeTemplate.authorizedMinter()).to.equal(ethers.ZeroAddress);
    });
  });

  // ---------------------------------------------------------------------------
  // Template Creation
  // ---------------------------------------------------------------------------

  describe("Template Creation", function () {
    it("Should allow anyone to create a template", async function () {
      await expect(badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n)).to.not.be
        .reverted;
    });

    it("Should auto-assign templateId starting at 0", async function () {
      const tx = await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map(log => {
          try {
            return badgeTemplate.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e?.name === "TemplateCreated");
      expect(event?.args?.templateId).to.equal(0n);
    });

    it("Should auto-assign badgeId starting at 1", async function () {
      const tx = await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map(log => {
          try {
            return badgeTemplate.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e?.name === "TemplateCreated");
      expect(event?.args?.badgeId).to.equal(1n);
    });

    it("Should increment nextTemplateId after creation", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      expect(await badgeTemplate.nextTemplateId()).to.equal(1n);
    });

    it("Should increment nextBadgeId after creation", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      expect(await badgeTemplate.nextBadgeId()).to.equal(2n);
    });

    it("Should store creator address correctly", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.creator).to.equal(creator1.address);
    });

    it("Should store metadataURI correctly", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.metadataURI).to.equal(METADATA_URI_1);
    });

    it("Should store requirements bytes correctly", async function () {
      const req = encodeRequirements(ethers.ZeroAddress, 100n, 50n, true);
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, req, 0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.requirements).to.equal(req);
    });

    it("Should compute requirementsHash as keccak256(requirements)", async function () {
      const req = encodeRequirements(ethers.ZeroAddress, 100n, 50n, false);
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, req, 0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      const expectedHash = ethers.keccak256(req);
      expect(tmpl.requirementsHash).to.equal(expectedHash);
    });

    it("Should stamp templateVersion with CURRENT_TEMPLATE_VERSION", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.templateVersion).to.equal(await badgeTemplate.CURRENT_TEMPLATE_VERSION());
    });

    it("Should store maxClaims correctly", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 100n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.maxClaims).to.equal(100n);
    });

    it("Should start template as active = true and archived = false", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.active).to.be.true;
      expect(tmpl.archived).to.be.false;
    });

    it("Should record createdAt as block timestamp", async function () {
      const tx = await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.createdAt).to.equal(BigInt(block!.timestamp));
    });

    it("Should emit enriched TemplateCreated event", async function () {
      const req = encodeRequirements();
      const expectedHash = ethers.keccak256(req);
      const version = await badgeTemplate.CURRENT_TEMPLATE_VERSION();

      await expect(badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, req, 50n))
        .to.emit(badgeTemplate, "TemplateCreated")
        .withArgs(0n, 1n, creator1.address, METADATA_URI_1, expectedHash, 50n, version);
    });

    it("Should allow multiple creators to create independent templates", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      await badgeTemplate.connect(creator2).createTemplate(METADATA_URI_2, EMPTY_REQUIREMENTS, 0n);

      const tmpl0 = await badgeTemplate.getTemplate(0n);
      const tmpl1 = await badgeTemplate.getTemplate(1n);

      expect(tmpl0.creator).to.equal(creator1.address);
      expect(tmpl1.creator).to.equal(creator2.address);
    });

    it("Should revert when metadataURI is empty", async function () {
      await expect(
        badgeTemplate.connect(creator1).createTemplate("", EMPTY_REQUIREMENTS, 0n),
      ).to.be.revertedWithCustomError(badgeTemplate, "EmptyMetadataURI");
    });

    it("Should track templates per creator via getTemplatesByCreator", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_2, EMPTY_REQUIREMENTS, 0n);
      await badgeTemplate.connect(creator2).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);

      const creator1Templates = await badgeTemplate.getTemplatesByCreator(creator1.address);
      const creator2Templates = await badgeTemplate.getTemplatesByCreator(creator2.address);

      expect(creator1Templates.length).to.equal(2);
      expect(creator1Templates[0]).to.equal(0n);
      expect(creator1Templates[1]).to.equal(1n);
      expect(creator2Templates.length).to.equal(1);
      expect(creator2Templates[0]).to.equal(2n);
    });
  });

  // ---------------------------------------------------------------------------
  // Badge ID Assignment
  // ---------------------------------------------------------------------------

  describe("Badge ID Assignment", function () {
    it("Should assign badgeId 1 to the first template", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.badgeId).to.equal(1n);
    });

    it("Should assign sequential badge IDs", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_2, EMPTY_REQUIREMENTS, 0n);
      await badgeTemplate.connect(creator2).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);

      const tmpl0 = await badgeTemplate.getTemplate(0n);
      const tmpl1 = await badgeTemplate.getTemplate(1n);
      const tmpl2 = await badgeTemplate.getTemplate(2n);

      expect(tmpl0.badgeId).to.equal(1n);
      expect(tmpl1.badgeId).to.equal(2n);
      expect(tmpl2.badgeId).to.equal(3n);
    });

    it("Should never reuse badge IDs (IDs are strictly sequential)", async function () {
      for (let i = 0; i < 5; i++) {
        await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      }
      const ids = await Promise.all(
        [0n, 1n, 2n, 3n, 4n].map(async id => {
          const t = await badgeTemplate.getTemplate(id);
          return t.badgeId;
        }),
      );
      const uniqueIds = new Set(ids.map(id => id.toString()));
      expect(uniqueIds.size).to.equal(5);
    });
  });

  // ---------------------------------------------------------------------------
  // Supply Caps
  // ---------------------------------------------------------------------------

  describe("Supply Caps", function () {
    beforeEach(async function () {
      // Set authorizedMinter so we can call incrementClaimCount
      await badgeTemplate.connect(owner).setAuthorizedMinter(authorizedMinter.address);
    });

    it("Should store maxClaims = 0 (unlimited) correctly", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.maxClaims).to.equal(0n);
    });

    it("Should store a specific maxClaims cap correctly", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 100n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.maxClaims).to.equal(100n);
    });

    it("isTemplateClaimable should return true for unlimited supply", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.true;
    });

    it("isTemplateClaimable should return false when supply cap is fully claimed", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 2n);

      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.true;

      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.false;
    });

    it("getTemplateClaimCount should track claims correctly", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);

      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(0n);
      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(1n);
      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(2n);
    });

    it("isTemplateClaimable should remain true under cap for unlimited", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      for (let i = 0; i < 10; i++) {
        await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      }
      expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // Template Management
  // ---------------------------------------------------------------------------

  describe("Template Management", function () {
    beforeEach(async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
    });

    describe("deactivateTemplate", function () {
      it("Should allow creator to deactivate a template", async function () {
        await badgeTemplate.connect(creator1).deactivateTemplate(0n);
        const tmpl = await badgeTemplate.getTemplate(0n);
        expect(tmpl.active).to.be.false;
      });

      it("Should emit TemplateDeactivated event", async function () {
        await expect(badgeTemplate.connect(creator1).deactivateTemplate(0n))
          .to.emit(badgeTemplate, "TemplateDeactivated")
          .withArgs(0n);
      });

      it("Should revert for non-creator", async function () {
        await expect(badgeTemplate.connect(user1).deactivateTemplate(0n)).to.be.revertedWithCustomError(
          badgeTemplate,
          "NotTemplateCreator",
        );
      });

      it("Should revert for non-existent template", async function () {
        await expect(badgeTemplate.connect(creator1).deactivateTemplate(99n)).to.be.revertedWithCustomError(
          badgeTemplate,
          "TemplateNotFound",
        );
      });

      it("Should revert if template is archived", async function () {
        await badgeTemplate.connect(creator1).archiveTemplate(0n);
        await expect(badgeTemplate.connect(creator1).deactivateTemplate(0n)).to.be.revertedWithCustomError(
          badgeTemplate,
          "TemplateIsArchived",
        );
      });
    });

    describe("reactivateTemplate", function () {
      it("Should allow creator to reactivate a deactivated template", async function () {
        await badgeTemplate.connect(creator1).deactivateTemplate(0n);
        await badgeTemplate.connect(creator1).reactivateTemplate(0n);
        const tmpl = await badgeTemplate.getTemplate(0n);
        expect(tmpl.active).to.be.true;
      });

      it("Should emit TemplateReactivated event", async function () {
        await badgeTemplate.connect(creator1).deactivateTemplate(0n);
        await expect(badgeTemplate.connect(creator1).reactivateTemplate(0n))
          .to.emit(badgeTemplate, "TemplateReactivated")
          .withArgs(0n);
      });

      it("Should revert for non-creator", async function () {
        await badgeTemplate.connect(creator1).deactivateTemplate(0n);
        await expect(badgeTemplate.connect(user1).reactivateTemplate(0n)).to.be.revertedWithCustomError(
          badgeTemplate,
          "NotTemplateCreator",
        );
      });

      it("Should revert if template is archived", async function () {
        await badgeTemplate.connect(creator1).archiveTemplate(0n);
        await expect(badgeTemplate.connect(creator1).reactivateTemplate(0n)).to.be.revertedWithCustomError(
          badgeTemplate,
          "TemplateIsArchived",
        );
      });
    });

    describe("updateRequirements", function () {
      it("Should allow creator to update requirements", async function () {
        const newReq = encodeRequirements(ethers.ZeroAddress, 500n, 0n, false);
        await badgeTemplate.connect(creator1).updateRequirements(0n, newReq);
        const tmpl = await badgeTemplate.getTemplate(0n);
        expect(tmpl.requirements).to.equal(newReq);
      });

      it("Should recalculate requirementsHash after update", async function () {
        const newReq = encodeRequirements(ethers.ZeroAddress, 500n, 0n, false);
        const expectedHash = ethers.keccak256(newReq);
        await badgeTemplate.connect(creator1).updateRequirements(0n, newReq);
        const tmpl = await badgeTemplate.getTemplate(0n);
        expect(tmpl.requirementsHash).to.equal(expectedHash);
      });

      it("Should emit RequirementsUpdated with new hash", async function () {
        const newReq = encodeRequirements(ethers.ZeroAddress, 500n, 0n, false);
        const expectedHash = ethers.keccak256(newReq);
        await expect(badgeTemplate.connect(creator1).updateRequirements(0n, newReq))
          .to.emit(badgeTemplate, "RequirementsUpdated")
          .withArgs(0n, expectedHash);
      });

      it("Should revert for non-creator", async function () {
        await expect(
          badgeTemplate.connect(user1).updateRequirements(0n, EMPTY_REQUIREMENTS),
        ).to.be.revertedWithCustomError(badgeTemplate, "NotTemplateCreator");
      });

      it("Should revert if template is archived", async function () {
        await badgeTemplate.connect(creator1).archiveTemplate(0n);
        await expect(
          badgeTemplate.connect(creator1).updateRequirements(0n, EMPTY_REQUIREMENTS),
        ).to.be.revertedWithCustomError(badgeTemplate, "TemplateIsArchived");
      });
    });

    describe("updateMetadataURI", function () {
      it("Should allow creator to update metadata URI", async function () {
        await badgeTemplate.connect(creator1).updateMetadataURI(0n, METADATA_URI_2);
        const tmpl = await badgeTemplate.getTemplate(0n);
        expect(tmpl.metadataURI).to.equal(METADATA_URI_2);
      });

      it("Should emit MetadataURIUpdated event", async function () {
        await expect(badgeTemplate.connect(creator1).updateMetadataURI(0n, METADATA_URI_2))
          .to.emit(badgeTemplate, "MetadataURIUpdated")
          .withArgs(0n, METADATA_URI_2);
      });

      it("Should revert for non-creator", async function () {
        await expect(badgeTemplate.connect(user1).updateMetadataURI(0n, METADATA_URI_2)).to.be.revertedWithCustomError(
          badgeTemplate,
          "NotTemplateCreator",
        );
      });

      it("Should revert for empty URI", async function () {
        await expect(badgeTemplate.connect(creator1).updateMetadataURI(0n, "")).to.be.revertedWithCustomError(
          badgeTemplate,
          "EmptyMetadataURI",
        );
      });

      it("Should revert if template is archived", async function () {
        await badgeTemplate.connect(creator1).archiveTemplate(0n);
        await expect(
          badgeTemplate.connect(creator1).updateMetadataURI(0n, METADATA_URI_2),
        ).to.be.revertedWithCustomError(badgeTemplate, "TemplateIsArchived");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Archiving
  // ---------------------------------------------------------------------------

  describe("Archiving", function () {
    beforeEach(async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
    });

    it("Should allow creator to archive a template", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0n);
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.archived).to.be.true;
      expect(tmpl.active).to.be.false;
    });

    it("Should emit TemplateArchived event", async function () {
      await expect(badgeTemplate.connect(creator1).archiveTemplate(0n))
        .to.emit(badgeTemplate, "TemplateArchived")
        .withArgs(0n);
    });

    it("Should revert for non-creator", async function () {
      await expect(badgeTemplate.connect(user1).archiveTemplate(0n)).to.be.revertedWithCustomError(
        badgeTemplate,
        "NotTemplateCreator",
      );
    });

    it("Should revert if already archived (permanent action)", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0n);
      await expect(badgeTemplate.connect(creator1).archiveTemplate(0n)).to.be.revertedWithCustomError(
        badgeTemplate,
        "TemplateIsArchived",
      );
    });

    it("isTemplateArchived should return true after archiving", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0n);
      expect(await badgeTemplate.isTemplateArchived(0n)).to.be.true;
    });

    it("isTemplateArchived should return false before archiving", async function () {
      expect(await badgeTemplate.isTemplateArchived(0n)).to.be.false;
    });

    it("isTemplateClaimable should return false for archived template", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0n);
      expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.false;
    });

    it("isTemplateActive should return false for archived template", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0n);
      expect(await badgeTemplate.isTemplateActive(0n)).to.be.false;
    });

    it("Cannot update requirements on archived template", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0n);
      await expect(
        badgeTemplate.connect(creator1).updateRequirements(0n, EMPTY_REQUIREMENTS),
      ).to.be.revertedWithCustomError(badgeTemplate, "TemplateIsArchived");
    });

    it("Cannot update metadata URI on archived template", async function () {
      await badgeTemplate.connect(creator1).archiveTemplate(0n);
      await expect(badgeTemplate.connect(creator1).updateMetadataURI(0n, METADATA_URI_2)).to.be.revertedWithCustomError(
        badgeTemplate,
        "TemplateIsArchived",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // View Functions
  // ---------------------------------------------------------------------------

  describe("View Functions", function () {
    beforeEach(async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
    });

    describe("getTemplate", function () {
      it("Should return correct data for an existing template", async function () {
        const tmpl = await badgeTemplate.getTemplate(0n);
        expect(tmpl.creator).to.equal(creator1.address);
        expect(tmpl.badgeId).to.equal(1n);
        expect(tmpl.metadataURI).to.equal(METADATA_URI_1);
        expect(tmpl.maxClaims).to.equal(0n);
        expect(tmpl.active).to.be.true;
        expect(tmpl.archived).to.be.false;
      });

      it("Should revert for non-existent template", async function () {
        await expect(badgeTemplate.getTemplate(99n)).to.be.revertedWithCustomError(badgeTemplate, "TemplateNotFound");
      });
    });

    describe("templateExists", function () {
      it("Should return true for existing templates", async function () {
        expect(await badgeTemplate.templateExists(0n)).to.be.true;
      });

      it("Should return false for non-existent templates", async function () {
        expect(await badgeTemplate.templateExists(1n)).to.be.false;
        expect(await badgeTemplate.templateExists(99n)).to.be.false;
      });
    });

    describe("isTemplateActive", function () {
      it("Should return true for active, non-archived template", async function () {
        expect(await badgeTemplate.isTemplateActive(0n)).to.be.true;
      });

      it("Should return false after deactivation", async function () {
        await badgeTemplate.connect(creator1).deactivateTemplate(0n);
        expect(await badgeTemplate.isTemplateActive(0n)).to.be.false;
      });

      it("Should return true after reactivation", async function () {
        await badgeTemplate.connect(creator1).deactivateTemplate(0n);
        await badgeTemplate.connect(creator1).reactivateTemplate(0n);
        expect(await badgeTemplate.isTemplateActive(0n)).to.be.true;
      });

      it("Should return false for non-existent template", async function () {
        expect(await badgeTemplate.isTemplateActive(99n)).to.be.false;
      });
    });

    describe("isTemplateClaimable", function () {
      it("Should return true for active, unlimited supply template", async function () {
        expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.true;
      });

      it("Should return false for deactivated template", async function () {
        await badgeTemplate.connect(creator1).deactivateTemplate(0n);
        expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.false;
      });

      it("Should return false for archived template", async function () {
        await badgeTemplate.connect(creator1).archiveTemplate(0n);
        expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.false;
      });

      it("Should return false for non-existent template", async function () {
        expect(await badgeTemplate.isTemplateClaimable(99n)).to.be.false;
      });
    });

    describe("getTemplatesByCreator", function () {
      it("Should return an empty array for address with no templates", async function () {
        const templates = await badgeTemplate.getTemplatesByCreator(user1.address);
        expect(templates.length).to.equal(0);
      });

      it("Should list all templates for a creator", async function () {
        await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_2, EMPTY_REQUIREMENTS, 0n);
        const templates = await badgeTemplate.getTemplatesByCreator(creator1.address);
        expect(templates.length).to.equal(2);
        expect(templates[0]).to.equal(0n);
        expect(templates[1]).to.equal(1n);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Claim Count (incrementClaimCount)
  // ---------------------------------------------------------------------------

  describe("Claim Count", function () {
    beforeEach(async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      await badgeTemplate.connect(owner).setAuthorizedMinter(authorizedMinter.address);
    });

    it("Should start at 0 for a new template", async function () {
      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(0n);
    });

    it("Should increment claim count when called by authorized minter", async function () {
      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(1n);
    });

    it("Should support multiple increments", async function () {
      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(3n);
    });

    it("Should emit TemplateClaimCountIncremented event", async function () {
      await expect(badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n))
        .to.emit(badgeTemplate, "TemplateClaimCountIncremented")
        .withArgs(0n, 1n);
    });

    it("Should emit TemplateClaimCountIncremented with updated count", async function () {
      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);
      await expect(badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n))
        .to.emit(badgeTemplate, "TemplateClaimCountIncremented")
        .withArgs(0n, 2n);
    });

    it("Should revert when called by non-authorized address", async function () {
      await expect(badgeTemplate.connect(user1).incrementClaimCount(0n)).to.be.revertedWithCustomError(
        badgeTemplate,
        "NotAuthorizedMinter",
      );
    });

    it("Should revert when called by owner (not the authorized minter)", async function () {
      await expect(badgeTemplate.connect(owner).incrementClaimCount(0n)).to.be.revertedWithCustomError(
        badgeTemplate,
        "NotAuthorizedMinter",
      );
    });

    it("Should revert for non-existent template", async function () {
      await expect(badgeTemplate.connect(authorizedMinter).incrementClaimCount(99n)).to.be.revertedWithCustomError(
        badgeTemplate,
        "TemplateNotFound",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Authorized Minter Management
  // ---------------------------------------------------------------------------

  describe("Authorized Minter Management", function () {
    it("Should allow owner to set authorized minter", async function () {
      await badgeTemplate.connect(owner).setAuthorizedMinter(authorizedMinter.address);
      expect(await badgeTemplate.authorizedMinter()).to.equal(authorizedMinter.address);
    });

    it("Should emit AuthorizedMinterUpdated event", async function () {
      await expect(badgeTemplate.connect(owner).setAuthorizedMinter(authorizedMinter.address))
        .to.emit(badgeTemplate, "AuthorizedMinterUpdated")
        .withArgs(authorizedMinter.address);
    });

    it("Should revert when non-owner tries to set authorized minter", async function () {
      await expect(
        badgeTemplate.connect(user1).setAuthorizedMinter(authorizedMinter.address),
      ).to.be.revertedWithCustomError(badgeTemplate, "OwnableUnauthorizedAccount");
    });

    it("Should revert when setting authorized minter to zero address", async function () {
      await expect(badgeTemplate.connect(owner).setAuthorizedMinter(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        badgeTemplate,
        "InvalidAddress",
      );
    });

    it("Should allow owner to update authorized minter to a new address", async function () {
      await badgeTemplate.connect(owner).setAuthorizedMinter(authorizedMinter.address);
      await badgeTemplate.connect(owner).setAuthorizedMinter(user1.address);
      expect(await badgeTemplate.authorizedMinter()).to.equal(user1.address);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe("Edge Cases", function () {
    it("Should handle large requirements bytes", async function () {
      const largeReq = ethers.hexlify(ethers.randomBytes(512));
      await expect(badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, largeReq, 0n)).to.not.be.reverted;
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.requirements).to.equal(largeReq);
    });

    it("Should handle maxClaims = 1 (one-of-one)", async function () {
      await badgeTemplate.connect(owner).setAuthorizedMinter(authorizedMinter.address);
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 1n);

      expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.true;

      await badgeTemplate.connect(authorizedMinter).incrementClaimCount(0n);

      expect(await badgeTemplate.isTemplateClaimable(0n)).to.be.false;
      expect(await badgeTemplate.getTemplateClaimCount(0n)).to.equal(1n);
    });

    it("Should handle empty requirements bytes", async function () {
      await expect(badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, "0x", 0n)).to.not.be.reverted;
    });

    it("Should keep template at ID 0 valid after other templates are created", async function () {
      await badgeTemplate.connect(creator1).createTemplate(METADATA_URI_1, EMPTY_REQUIREMENTS, 0n);
      await badgeTemplate.connect(creator2).createTemplate(METADATA_URI_2, EMPTY_REQUIREMENTS, 0n);
      await badgeTemplate.connect(creator2).createTemplate(METADATA_URI_2, EMPTY_REQUIREMENTS, 0n);

      expect(await badgeTemplate.templateExists(0n)).to.be.true;
      const tmpl = await badgeTemplate.getTemplate(0n);
      expect(tmpl.creator).to.equal(creator1.address);
    });
  });
});
