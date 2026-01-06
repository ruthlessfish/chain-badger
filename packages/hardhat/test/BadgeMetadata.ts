import { expect } from "chai";
import { ethers } from "hardhat";
import { BadgeMetadata } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BadgeMetadata", function () {
  let badgeMetadata: BadgeMetadata;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  const BASE_URI = "https://chain-badger.vercel.app/metadata/";
  const BADGE_ID_1 = 1;
  const BADGE_ID_2 = 2;
  const BADGE_ID_3 = 3;

  // Sample badge data
  const badge1Data = {
    name: "First Blood",
    description: "Awarded for your first transaction",
    image: "ipfs://QmFirstBlood",
    category: "Milestone",
    rarity: 0, // Common
  };

  const badge2Data = {
    name: "DeFi Master",
    description: "Completed 100 DeFi transactions",
    image: "ipfs://QmDeFiMaster",
    category: "DeFi",
    rarity: 3, // Epic
  };

  const badge3Data = {
    name: "Legendary Trader",
    description: "Achieved $1M in trading volume",
    image: "ipfs://QmLegendary",
    category: "Trading",
    rarity: 4, // Legendary
  };

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const BadgeMetadata = await ethers.getContractFactory("BadgeMetadata");
    badgeMetadata = await BadgeMetadata.deploy(owner.address, BASE_URI);
    await badgeMetadata.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await badgeMetadata.owner()).to.equal(owner.address);
    });

    it("Should set the correct base URI", async function () {
      expect(await badgeMetadata.baseURI()).to.equal(BASE_URI);
    });

    it("Should start with no badges", async function () {
      const hasBadge = await badgeMetadata.hasBadgeMetadata(BADGE_ID_1);
      void expect(hasBadge).to.be.false;
    });
  });

  describe("Setting Badge Data", function () {
    it("Should allow owner to set badge data", async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);

      const metadata = await badgeMetadata.getBadgeMetadata(BADGE_ID_1);
      expect(metadata.name).to.equal(badge1Data.name);
      expect(metadata.description).to.equal(badge1Data.description);
      expect(metadata.image).to.equal(badge1Data.image);
      expect(metadata.category).to.equal(badge1Data.category);
      expect(metadata.rarity).to.equal(badge1Data.rarity);
    });

    it("Should emit BadgeMetadataUpdated event", async function () {
      await expect(badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data))
        .to.emit(badgeMetadata, "BadgeMetadataUpdated")
        .withArgs(BADGE_ID_1, badge1Data.name, badge1Data.category);
    });

    it("Should mark badge as existing", async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);
      const hasBadge = await badgeMetadata.hasBadgeMetadata(BADGE_ID_1);
      void expect(hasBadge).to.be.true;
    });

    it("Should prevent non-owner from setting badge data", async function () {
      await expect(badgeMetadata.connect(user1).setBadgeData(BADGE_ID_1, badge1Data)).to.be.revertedWithCustomError(
        badgeMetadata,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should revert when name is empty", async function () {
      const invalidBadge = { ...badge1Data, name: "" };
      await expect(badgeMetadata.setBadgeData(BADGE_ID_1, invalidBadge)).to.be.revertedWithCustomError(
        badgeMetadata,
        "EmptyName",
      );
    });

    it("Should revert when rarity is invalid (>4)", async function () {
      const invalidBadge = { ...badge1Data, rarity: 5 };
      await expect(badgeMetadata.setBadgeData(BADGE_ID_1, invalidBadge)).to.be.revertedWithCustomError(
        badgeMetadata,
        "InvalidRarity",
      );
    });

    it("Should allow updating existing badge data", async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);

      const updatedData = { ...badge1Data, name: "Updated Name" };
      await badgeMetadata.setBadgeData(BADGE_ID_1, updatedData);

      const metadata = await badgeMetadata.getBadgeMetadata(BADGE_ID_1);
      expect(metadata.name).to.equal("Updated Name");
    });
  });

  describe("Batch Operations", function () {
    it("Should allow batch setting of badge data", async function () {
      await badgeMetadata.setBadgeDataBatch([BADGE_ID_1, BADGE_ID_2], [badge1Data, badge2Data]);

      const metadata1 = await badgeMetadata.getBadgeMetadata(BADGE_ID_1);
      const metadata2 = await badgeMetadata.getBadgeMetadata(BADGE_ID_2);

      expect(metadata1.name).to.equal(badge1Data.name);
      expect(metadata2.name).to.equal(badge2Data.name);
    });

    it("Should emit events for each badge in batch", async function () {
      await expect(badgeMetadata.setBadgeDataBatch([BADGE_ID_1, BADGE_ID_2], [badge1Data, badge2Data]))
        .to.emit(badgeMetadata, "BadgeMetadataUpdated")
        .withArgs(BADGE_ID_1, badge1Data.name, badge1Data.category)
        .to.emit(badgeMetadata, "BadgeMetadataUpdated")
        .withArgs(BADGE_ID_2, badge2Data.name, badge2Data.category);
    });

    it("Should revert if array lengths mismatch", async function () {
      await expect(
        badgeMetadata.setBadgeDataBatch(
          [BADGE_ID_1, BADGE_ID_2],
          [badge1Data], // Only one element
        ),
      ).to.be.revertedWith("Length mismatch");
    });

    it("Should revert batch if any badge has empty name", async function () {
      const invalidBadge = { ...badge1Data, name: "" };
      await expect(
        badgeMetadata.setBadgeDataBatch([BADGE_ID_1, BADGE_ID_2], [badge1Data, invalidBadge]),
      ).to.be.revertedWithCustomError(badgeMetadata, "EmptyName");
    });

    it("Should handle large batches", async function () {
      const ids = [1, 2, 3, 4, 5];
      const data = [badge1Data, badge2Data, badge3Data, badge1Data, badge2Data];

      await badgeMetadata.setBadgeDataBatch(ids, data);

      for (let i = 0; i < ids.length; i++) {
        const hasBadge = await badgeMetadata.hasBadgeMetadata(ids[i]);
        void expect(hasBadge).to.be.true;
      }
    });
  });

  describe("Base URI Management", function () {
    it("Should allow owner to update base URI", async function () {
      const newURI = "https://newchain-badger.vercel.app/";
      await badgeMetadata.setBaseURI(newURI);
      expect(await badgeMetadata.baseURI()).to.equal(newURI);
    });

    it("Should emit BaseURIUpdated event", async function () {
      const newURI = "https://newchain-badger.vercel.app/";
      await expect(badgeMetadata.setBaseURI(newURI)).to.emit(badgeMetadata, "BaseURIUpdated").withArgs(newURI);
    });

    it("Should prevent non-owner from updating base URI", async function () {
      await expect(badgeMetadata.connect(user1).setBaseURI("https://malicious.com/")).to.be.revertedWithCustomError(
        badgeMetadata,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("Badge Deletion", function () {
    beforeEach(async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);
    });

    it("Should allow owner to delete badge", async function () {
      await badgeMetadata.deleteBadge(BADGE_ID_1);
      const hasBadge = await badgeMetadata.hasBadgeMetadata(BADGE_ID_1);
      void expect(hasBadge).to.be.false;
    });

    it("Should emit BadgeDeleted event", async function () {
      await expect(badgeMetadata.deleteBadge(BADGE_ID_1)).to.emit(badgeMetadata, "BadgeDeleted").withArgs(BADGE_ID_1);
    });

    it("Should revert when deleting non-existent badge", async function () {
      await expect(badgeMetadata.deleteBadge(BADGE_ID_2)).to.be.revertedWithCustomError(badgeMetadata, "BadgeNotFound");
    });

    it("Should prevent non-owner from deleting badge", async function () {
      await expect(badgeMetadata.connect(user1).deleteBadge(BADGE_ID_1)).to.be.revertedWithCustomError(
        badgeMetadata,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should allow re-adding badge after deletion", async function () {
      await badgeMetadata.deleteBadge(BADGE_ID_1);
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge2Data);

      const metadata = await badgeMetadata.getBadgeMetadata(BADGE_ID_1);
      expect(metadata.name).to.equal(badge2Data.name);
    });
  });

  describe("Metadata Getters", function () {
    beforeEach(async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);
      await badgeMetadata.setBadgeData(BADGE_ID_2, badge2Data);
      await badgeMetadata.setBadgeData(BADGE_ID_3, badge3Data);
    });

    it("Should return complete badge metadata", async function () {
      const metadata = await badgeMetadata.getBadgeMetadata(BADGE_ID_1);
      expect(metadata.name).to.equal(badge1Data.name);
      expect(metadata.description).to.equal(badge1Data.description);
      expect(metadata.image).to.equal(badge1Data.image);
      expect(metadata.category).to.equal(badge1Data.category);
      expect(metadata.rarity).to.equal(badge1Data.rarity);
    });

    it("Should revert when getting non-existent badge", async function () {
      await expect(badgeMetadata.getBadgeMetadata(999)).to.be.revertedWithCustomError(badgeMetadata, "BadgeNotFound");
    });

    it("Should return correct token URI", async function () {
      const uri = await badgeMetadata.getTokenURI(BADGE_ID_1);
      expect(uri).to.equal(`${BASE_URI}${BADGE_ID_1}`);
    });

    it("Should return badge data fields separately", async function () {
      const [name, description, image, category, rarity] = await badgeMetadata.getBadgeDataFields(BADGE_ID_1);

      expect(name).to.equal(badge1Data.name);
      expect(description).to.equal(badge1Data.description);
      expect(image).to.equal(badge1Data.image);
      expect(category).to.equal(badge1Data.category);
      expect(rarity).to.equal(badge1Data.rarity);
    });
  });

  describe("Rarity System", function () {
    beforeEach(async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data); // Common (0)
      await badgeMetadata.setBadgeData(BADGE_ID_2, badge2Data); // Epic (3)
      await badgeMetadata.setBadgeData(BADGE_ID_3, badge3Data); // Legendary (4)
    });

    it("Should return 'Common' for rarity 0", async function () {
      expect(await badgeMetadata.getBadgeRarity(BADGE_ID_1)).to.equal("Common");
    });

    it("Should return 'Epic' for rarity 3", async function () {
      expect(await badgeMetadata.getBadgeRarity(BADGE_ID_2)).to.equal("Epic");
    });

    it("Should return 'Legendary' for rarity 4", async function () {
      expect(await badgeMetadata.getBadgeRarity(BADGE_ID_3)).to.equal("Legendary");
    });

    it("Should support all rarity levels", async function () {
      const rarities = [
        { level: 0, name: "Common" },
        { level: 1, name: "Uncommon" },
        { level: 2, name: "Rare" },
        { level: 3, name: "Epic" },
        { level: 4, name: "Legendary" },
      ];

      for (const { level, name } of rarities) {
        const badge = { ...badge1Data, rarity: level };
        await badgeMetadata.setBadgeData(100 + level, badge);
        const rarityName = await badgeMetadata.getBadgeRarity(100 + level);
        expect(rarityName).to.equal(name);
      }
    });
  });

  describe("JSON Metadata Generation", function () {
    beforeEach(async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);
    });

    it("Should generate valid JSON metadata", async function () {
      const json = await badgeMetadata.getMetadataJSON(BADGE_ID_1);

      expect(json).to.include(`"name":"${badge1Data.name}"`);
      expect(json).to.include(`"description":"${badge1Data.description}"`);
      expect(json).to.include(`"image":"${badge1Data.image}"`);
      expect(json).to.include(`"Category","value":"${badge1Data.category}"`);
      expect(json).to.include(`"Rarity","value":"Common"`);
    });

    it("Should include rarity in attributes", async function () {
      const json = await badgeMetadata.getMetadataJSON(BADGE_ID_1);
      expect(json).to.include('"trait_type":"Rarity"');
      expect(json).to.include('"trait_type":"Rarity Level"');
    });

    it("Should generate different JSON for different badges", async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_2, badge2Data);

      const json1 = await badgeMetadata.getMetadataJSON(BADGE_ID_1);
      const json2 = await badgeMetadata.getMetadataJSON(BADGE_ID_2);

      expect(json1).to.not.equal(json2);
      expect(json1).to.include(badge1Data.name);
      expect(json2).to.include(badge2Data.name);
    });

    it("Should revert when generating JSON for non-existent badge", async function () {
      await expect(badgeMetadata.getMetadataJSON(999)).to.be.revertedWithCustomError(badgeMetadata, "BadgeNotFound");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle badges with special characters in metadata", async function () {
      const specialBadge = {
        name: "Badge with 'quotes' and \"double quotes\"",
        description: "Description with\nnewlines\tand\ttabs",
        image: "ipfs://QmSpecial",
        category: "Special & Unusual",
        rarity: 0,
      };

      await badgeMetadata.setBadgeData(BADGE_ID_1, specialBadge);
      const metadata = await badgeMetadata.getBadgeMetadata(BADGE_ID_1);

      expect(metadata.name).to.equal(specialBadge.name);
      expect(metadata.description).to.equal(specialBadge.description);
    });

    it("Should handle very long metadata strings", async function () {
      const longBadge = {
        name: "A".repeat(1000),
        description: "B".repeat(5000),
        image: "ipfs://Qm" + "c".repeat(500),
        category: "Long",
        rarity: 0,
      };

      await badgeMetadata.setBadgeData(BADGE_ID_1, longBadge);
      const metadata = await badgeMetadata.getBadgeMetadata(BADGE_ID_1);

      expect(metadata.name.length).to.equal(1000);
      expect(metadata.description.length).to.equal(5000);
    });

    it("Should handle badge ID 0", async function () {
      await badgeMetadata.setBadgeData(0, badge1Data);
      const hasBadge0 = await badgeMetadata.hasBadgeMetadata(0);
      void expect(hasBadge0).to.be.true;
    });

    it("Should handle very large badge IDs", async function () {
      const largeBadgeId = 999999999;
      await badgeMetadata.setBadgeData(largeBadgeId, badge1Data);

      const uri = await badgeMetadata.getTokenURI(largeBadgeId);
      expect(uri).to.equal(`${BASE_URI}${largeBadgeId}`);
    });

    it("Should maintain independent data for different badges", async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);
      await badgeMetadata.setBadgeData(BADGE_ID_2, badge2Data);

      const metadata1 = await badgeMetadata.getBadgeMetadata(BADGE_ID_1);
      const metadata2 = await badgeMetadata.getBadgeMetadata(BADGE_ID_2);

      expect(metadata1.name).to.not.equal(metadata2.name);
      expect(metadata1.category).to.not.equal(metadata2.category);
    });
  });

  describe("Helper Functions", function () {
    it("Should correctly report badge existence", async function () {
      let hasBadge = await badgeMetadata.hasBadgeMetadata(BADGE_ID_1);
      void expect(hasBadge).to.be.false;

      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);
      hasBadge = await badgeMetadata.hasBadgeMetadata(BADGE_ID_1);
      void expect(hasBadge).to.be.true;
    });

    it("Should track multiple badges independently", async function () {
      await badgeMetadata.setBadgeData(BADGE_ID_1, badge1Data);

      const hasBadge1 = await badgeMetadata.hasBadgeMetadata(BADGE_ID_1);
      const hasBadge2 = await badgeMetadata.hasBadgeMetadata(BADGE_ID_2);
      void expect(hasBadge1).to.be.true;
      void expect(hasBadge2).to.be.false;
    });
  });
});
