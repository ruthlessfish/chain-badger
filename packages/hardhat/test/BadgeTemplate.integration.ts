import { expect } from "chai";
import { ethers } from "hardhat";
import { BadgeToken, BadgeMinter, BadgeTemplate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { TypedDataDomain, TypedDataField } from "ethers";

describe("Badge Template Integration Tests", function () {
  let badgeToken: BadgeToken;
  let badgeMinter: BadgeMinter;
  let badgeTemplate: BadgeTemplate;
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let creator: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const BASE_URI = "https://chain-badger.vercel.app/metadata/";
  const METADATA_URI = "ipfs://QmTestTemplate";

  // EIP-712 setup
  let domain: TypedDataDomain;
  const templateTypes: Record<string, TypedDataField[]> = {
    TemplateClaim: [
      { name: "user", type: "address" },
      { name: "templateId", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  beforeEach(async function () {
    [owner, signer, creator, user1, user2, user3] = await ethers.getSigners();

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

    // Setup roles
    const MINTER_ROLE = await badgeToken.MINTER_ROLE();
    await badgeToken.grantRole(MINTER_ROLE, await badgeMinter.getAddress());
    await badgeMinter.setBadgeTemplate(await badgeTemplate.getAddress());
    await badgeTemplate.setAuthorizedMinter(await badgeMinter.getAddress());

    // Setup EIP-712 domain
    domain = {
      name: "BadgeMinter",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await badgeMinter.getAddress(),
    };
  });

  describe("Full Create → Claim Workflow", function () {
    it("Should complete entire template creation and claiming flow", async function () {
      // STEP 1: Creator creates a template
      const requirements = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [ethers.ZeroAddress, 100]);
      const maxClaims = 10;

      const createTx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, requirements, maxClaims);
      const createReceipt = await createTx.wait();

      // Verify template created event
      const createEvent = createReceipt?.logs.find((log: any) => log.eventName === "TemplateCreated");
      void expect(createEvent).to.not.be.undefined;
      const templateId = Number(createEvent?.args?.templateId);
      const badgeId = Number(createEvent?.args?.badgeId);

      // STEP 2: Verify template details
      const template = await badgeTemplate.getTemplate(templateId);
      expect(template.creator).to.equal(creator.address);
      expect(template.badgeId).to.equal(badgeId);
      expect(template.metadataURI).to.equal(METADATA_URI);
      expect(template.maxClaims).to.equal(maxClaims);
      void expect(template.active).to.be.true;
      void expect(template.archived).to.be.false;

      // STEP 3: User1 claims the badge
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const message1 = { user: user1.address, templateId, deadline };
      const signature1 = await signer.signTypedData(domain, templateTypes, message1);

      await expect(badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, signature1))
        .to.emit(badgeMinter, "BadgeClaimed")
        .withArgs(user1.address, badgeId)
        .to.emit(badgeMinter, "TemplateBadgeClaimed")
        .withArgs(user1.address, templateId, badgeId);

      // STEP 4: Verify user1 received the badge
      expect(await badgeToken.balanceOf(user1.address, badgeId)).to.equal(1);
      void expect(await badgeMinter.hasClaimed(user1.address, badgeId)).to.be.true;

      // STEP 5: Verify claim count increased
      expect(await badgeTemplate.getTemplateClaimCount(templateId)).to.equal(1);

      // STEP 6: User2 also claims
      const message2 = { user: user2.address, templateId, deadline };
      const signature2 = await signer.signTypedData(domain, templateTypes, message2);
      await badgeMinter.connect(user2).claimTemplateBadge(templateId, deadline, signature2);

      expect(await badgeToken.balanceOf(user2.address, badgeId)).to.equal(1);
      expect(await badgeTemplate.getTemplateClaimCount(templateId)).to.equal(2);

      // STEP 7: Creator deactivates template
      await badgeTemplate.connect(creator).deactivateTemplate(templateId);
      void expect(await badgeTemplate.isTemplateActive(templateId)).to.be.false;

      // STEP 8: User3 cannot claim from deactivated template
      const message3 = { user: user3.address, templateId, deadline };
      const signature3 = await signer.signTypedData(domain, templateTypes, message3);
      await expect(
        badgeMinter.connect(user3).claimTemplateBadge(templateId, deadline, signature3),
      ).to.be.revertedWithCustomError(badgeMinter, "TemplateNotActive");

      // STEP 9: Creator reactivates template
      await badgeTemplate.connect(creator).reactivateTemplate(templateId);
      void expect(await badgeTemplate.isTemplateActive(templateId)).to.be.true;

      // STEP 10: User3 can now claim
      await expect(badgeMinter.connect(user3).claimTemplateBadge(templateId, deadline, signature3)).to.not.be.reverted;

      expect(await badgeToken.balanceOf(user3.address, badgeId)).to.equal(1);
      expect(await badgeTemplate.getTemplateClaimCount(templateId)).to.equal(3);
    });

    it("Should handle supply cap enforcement across multiple users", async function () {
      // Create template with supply cap of 2
      const requirements = ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["Basic requirements"]);
      const createTx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, requirements, 2);
      const createReceipt = await createTx.wait();
      const templateId = Number(
        createReceipt?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.templateId,
      );

      const deadline = Math.floor(Date.now() / 1000) + 600;

      // User1 claims successfully
      const sig1 = await signer.signTypedData(domain, templateTypes, { user: user1.address, templateId, deadline });
      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig1);

      // User2 claims successfully
      const sig2 = await signer.signTypedData(domain, templateTypes, { user: user2.address, templateId, deadline });
      await badgeMinter.connect(user2).claimTemplateBadge(templateId, deadline, sig2);

      // Claim count should be 2
      expect(await badgeTemplate.getTemplateClaimCount(templateId)).to.equal(2);

      // User3 cannot claim (cap reached)
      const sig3 = await signer.signTypedData(domain, templateTypes, { user: user3.address, templateId, deadline });
      await expect(
        badgeMinter.connect(user3).claimTemplateBadge(templateId, deadline, sig3),
      ).to.be.revertedWithCustomError(badgeMinter, "SupplyCapReached");

      // isTemplateClaimable should return false
      void expect(await badgeTemplate.isTemplateClaimable(templateId)).to.be.false;
    });

    it("Should allow creator to update requirements mid-lifecycle", async function () {
      // Create initial template
      const initialRequirements = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [100]);
      const createTx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, initialRequirements, 0);
      const createReceipt = await createTx.wait();
      const templateId = Number(
        createReceipt?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.templateId,
      );

      // User1 claims with initial requirements
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const sig1 = await signer.signTypedData(domain, templateTypes, { user: user1.address, templateId, deadline });
      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig1);

      // Creator updates requirements
      const newRequirements = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [200]);
      const newHash = ethers.keccak256(newRequirements);
      await expect(badgeTemplate.connect(creator).updateRequirements(templateId, newRequirements))
        .to.emit(badgeTemplate, "RequirementsUpdated")
        .withArgs(templateId, newHash);

      // Verify updated requirements
      const template = await badgeTemplate.getTemplate(templateId);
      expect(template.requirements).to.equal(newRequirements);
      expect(template.requirementsHash).to.equal(newHash);

      // User2 can still claim (backend should verify new requirements)
      const sig2 = await signer.signTypedData(domain, templateTypes, { user: user2.address, templateId, deadline });
      await expect(badgeMinter.connect(user2).claimTemplateBadge(templateId, deadline, sig2)).to.not.be.reverted;
    });

    it("Should prevent archived template from being claimed", async function () {
      // Create and claim from template
      const requirements = ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]);
      const createTx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, requirements, 0);
      const createReceipt = await createTx.wait();
      const templateId = Number(
        createReceipt?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.templateId,
      );

      const deadline = Math.floor(Date.now() / 1000) + 600;

      // User1 claims successfully
      const sig1 = await signer.signTypedData(domain, templateTypes, { user: user1.address, templateId, deadline });
      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline, sig1);

      // Creator archives template
      await badgeTemplate.connect(creator).archiveTemplate(templateId);
      void expect(await badgeTemplate.isTemplateArchived(templateId)).to.be.true;
      void expect(await badgeTemplate.isTemplateClaimable(templateId)).to.be.false;

      // User2 cannot claim from archived template
      const sig2 = await signer.signTypedData(domain, templateTypes, { user: user2.address, templateId, deadline });
      await expect(
        badgeMinter.connect(user2).claimTemplateBadge(templateId, deadline, sig2),
      ).to.be.revertedWithCustomError(badgeMinter, "TemplateNotActive");

      // Creator cannot reactivate archived template
      await expect(badgeTemplate.connect(creator).reactivateTemplate(templateId)).to.be.revertedWithCustomError(
        badgeTemplate,
        "TemplateArchived",
      );
    });

    it("Should track multiple templates by same creator", async function () {
      const requirements = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1]);

      // Creator creates 3 templates
      await badgeTemplate.connect(creator).createTemplate(METADATA_URI + "1", requirements, 10);
      await badgeTemplate.connect(creator).createTemplate(METADATA_URI + "2", requirements, 20);
      await badgeTemplate.connect(creator).createTemplate(METADATA_URI + "3", requirements, 30);

      // Get all templates by creator
      const creatorTemplates = await badgeTemplate.getTemplatesByCreator(creator.address);
      expect(creatorTemplates.length).to.equal(3);
      expect(creatorTemplates[0]).to.equal(0);
      expect(creatorTemplates[1]).to.equal(1);
      expect(creatorTemplates[2]).to.equal(2);

      // Verify each template has correct creator
      for (let i = 0; i < 3; i++) {
        const template = await badgeTemplate.getTemplate(i);
        expect(template.creator).to.equal(creator.address);
      }
    });
  });

  describe("Edge Cases and Error Scenarios", function () {
    it("Should prevent user from claiming same badge twice", async function () {
      const requirements = ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]);
      const createTx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, requirements, 0);
      const createReceipt = await createTx.wait();
      const templateId = Number(
        createReceipt?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.templateId,
      );

      const deadline1 = Math.floor(Date.now() / 1000) + 600;
      const deadline2 = Math.floor(Date.now() / 1000) + 700;

      // First claim succeeds
      const sig1 = await signer.signTypedData(domain, templateTypes, {
        user: user1.address,
        templateId,
        deadline: deadline1,
      });
      await badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline1, sig1);

      // Second claim with new signature fails
      const sig2 = await signer.signTypedData(domain, templateTypes, {
        user: user1.address,
        templateId,
        deadline: deadline2,
      });
      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, deadline2, sig2),
      ).to.be.revertedWithCustomError(badgeMinter, "AlreadyClaimed");
    });

    it("Should handle expired signatures", async function () {
      const requirements = ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]);
      const createTx = await badgeTemplate.connect(creator).createTemplate(METADATA_URI, requirements, 0);
      const createReceipt = await createTx.wait();
      const templateId = Number(
        createReceipt?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.templateId,
      );

      // Create signature with deadline in the past
      const expiredDeadline = Math.floor(Date.now() / 1000) - 60;
      const signature = await signer.signTypedData(domain, templateTypes, {
        user: user1.address,
        templateId,
        deadline: expiredDeadline,
      });

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(templateId, expiredDeadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "SignatureExpired");
    });

    it("Should handle non-existent template gracefully", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const nonExistentTemplateId = 999;
      const signature = await signer.signTypedData(domain, templateTypes, {
        user: user1.address,
        templateId: nonExistentTemplateId,
        deadline,
      });

      await expect(
        badgeMinter.connect(user1).claimTemplateBadge(nonExistentTemplateId, deadline, signature),
      ).to.be.revertedWithCustomError(badgeMinter, "TemplateNotFound");
    });
  });

  describe("Multi-Template Scenarios", function () {
    it("Should allow user to claim badges from multiple templates", async function () {
      const requirements = ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]);

      // Create two templates
      const createTx1 = await badgeTemplate.connect(creator).createTemplate(METADATA_URI + "1", requirements, 0);
      const createReceipt1 = await createTx1.wait();
      const templateId1 = Number(
        createReceipt1?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.templateId,
      );
      const badgeId1 = Number(
        createReceipt1?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.badgeId,
      );

      const createTx2 = await badgeTemplate.connect(creator).createTemplate(METADATA_URI + "2", requirements, 0);
      const createReceipt2 = await createTx2.wait();
      const templateId2 = Number(
        createReceipt2?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.templateId,
      );
      const badgeId2 = Number(
        createReceipt2?.logs.find((log: any) => log.eventName === "TemplateCreated")?.args?.badgeId,
      );

      const deadline = Math.floor(Date.now() / 1000) + 600;

      // User1 claims from both templates
      const sig1 = await signer.signTypedData(domain, templateTypes, {
        user: user1.address,
        templateId: templateId1,
        deadline,
      });
      await badgeMinter.connect(user1).claimTemplateBadge(templateId1, deadline, sig1);

      const sig2 = await signer.signTypedData(domain, templateTypes, {
        user: user1.address,
        templateId: templateId2,
        deadline,
      });
      await badgeMinter.connect(user1).claimTemplateBadge(templateId2, deadline, sig2);

      // Verify user has both badges
      expect(await badgeToken.balanceOf(user1.address, badgeId1)).to.equal(1);
      expect(await badgeToken.balanceOf(user1.address, badgeId2)).to.equal(1);
    });
  });
});
