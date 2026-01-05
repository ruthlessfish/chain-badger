import { expect } from "chai";
import { ethers } from "hardhat";
import { BadgeToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BadgeToken", function () {
  let badgeToken: BadgeToken;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const BASE_URI = "https://api.chainbadger.com/metadata/";
  const BADGE_ID_1 = 1;
  const BADGE_ID_2 = 2;

  beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();

    // Deploy BadgeToken contract
    const BadgeToken = await ethers.getContractFactory("BadgeToken");
    badgeToken = await BadgeToken.deploy(BASE_URI);
    await badgeToken.waitForDeployment();

    // Grant MINTER_ROLE to minter account
    const MINTER_ROLE = await badgeToken.MINTER_ROLE();
    await badgeToken.grantRole(MINTER_ROLE, minter.address);
  });

  describe("Deployment", function () {
    it("Should set the correct base URI", async function () {
      expect(await badgeToken.uri(0)).to.equal(BASE_URI);
    });

    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await badgeToken.DEFAULT_ADMIN_ROLE();
      const hasRole = await badgeToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
      expect(hasRole).to.be.true;
    });

    it("Should grant ADMIN_ROLE to deployer", async function () {
      const ADMIN_ROLE = await badgeToken.ADMIN_ROLE();
      const hasRole = await badgeToken.hasRole(ADMIN_ROLE, owner.address);
      expect(hasRole).to.be.true;
    });

    it("Should start with soulbound disabled", async function () {
      const soulbound = await badgeToken.soulboundEnabled();
      expect(soulbound).to.be.false;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant MINTER_ROLE", async function () {
      const MINTER_ROLE = await badgeToken.MINTER_ROLE();
      await badgeToken.grantRole(MINTER_ROLE, user1.address);
      const hasRole = await badgeToken.hasRole(MINTER_ROLE, user1.address);
      expect(hasRole).to.be.true;
    });

    it("Should prevent non-admin from granting roles", async function () {
      const MINTER_ROLE = await badgeToken.MINTER_ROLE();
      await expect(
        badgeToken.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.reverted;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint badges", async function () {
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      
      const balance = await badgeToken.balanceOf(user1.address, BADGE_ID_1);
      expect(balance).to.equal(1);
    });

    it("Should emit BadgeMinted event", async function () {
      await expect(badgeToken.connect(minter).mint(user1.address, BADGE_ID_1))
        .to.emit(badgeToken, "BadgeMinted")
        .withArgs(user1.address, BADGE_ID_1);
    });

    it("Should prevent non-minter from minting", async function () {
      await expect(
        badgeToken.connect(user1).mint(user2.address, BADGE_ID_1)
      ).to.be.reverted;
    });

    it("Should revert when minting to zero address", async function () {
      await expect(
        badgeToken.connect(minter).mint(ethers.ZeroAddress, BADGE_ID_1)
      ).to.be.revertedWithCustomError(badgeToken, "InvalidAddress");
    });

    it("Should allow minting multiple different badges to same user", async function () {
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_2);
      
      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_1)).to.equal(1);
      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_2)).to.equal(1);
    });
  });

  describe("Soulbound Mode", function () {
    beforeEach(async function () {
      // Mint a badge to user1
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
    });

    it("Should allow transfers when soulbound is disabled", async function () {
      await badgeToken
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, BADGE_ID_1, 1, "0x");
      
      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_1)).to.equal(0);
      expect(await badgeToken.balanceOf(user2.address, BADGE_ID_1)).to.equal(1);
    });

    it("Should allow admin to enable soulbound mode", async function () {
      await badgeToken.setSoulbound(true);
      const soulbound = await badgeToken.soulboundEnabled();
      expect(soulbound).to.be.true;
    });

    it("Should emit SoulboundModeUpdated event", async function () {
      await expect(badgeToken.setSoulbound(true))
        .to.emit(badgeToken, "SoulboundModeUpdated")
        .withArgs(true);
    });

    it("Should prevent transfers when soulbound is enabled", async function () {
      await badgeToken.setSoulbound(true);
      
      await expect(
        badgeToken
          .connect(user1)
          .safeTransferFrom(user1.address, user2.address, BADGE_ID_1, 1, "0x")
      ).to.be.revertedWithCustomError(badgeToken, "TransferBlocked");
    });

    it("Should still allow minting when soulbound is enabled", async function () {
      await badgeToken.setSoulbound(true);
      
      await badgeToken.connect(minter).mint(user2.address, BADGE_ID_2);
      expect(await badgeToken.balanceOf(user2.address, BADGE_ID_2)).to.equal(1);
    });

    it("Should prevent non-admin from toggling soulbound", async function () {
      await expect(
        badgeToken.connect(user1).setSoulbound(true)
      ).to.be.reverted;
    });

    it("Should allow admin to disable soulbound mode", async function () {
      await badgeToken.setSoulbound(true);
      await badgeToken.setSoulbound(false);
      
      const soulbound = await badgeToken.soulboundEnabled();
      expect(soulbound).to.be.false;
    });
  });

  describe("Metadata Management", function () {
    it("Should return base URI for badges without custom URI", async function () {
      expect(await badgeToken.uri(BADGE_ID_1)).to.equal(BASE_URI);
    });

    it("Should allow admin to set custom badge URI", async function () {
      const customURI = "ipfs://QmCustomBadge1";
      await badgeToken.setBadgeURI(BADGE_ID_1, customURI);
      
      expect(await badgeToken.uri(BADGE_ID_1)).to.equal(customURI);
    });

    it("Should emit BadgeURIUpdated event", async function () {
      const customURI = "ipfs://QmCustomBadge1";
      
      await expect(badgeToken.setBadgeURI(BADGE_ID_1, customURI))
        .to.emit(badgeToken, "BadgeURIUpdated")
        .withArgs(BADGE_ID_1, customURI);
    });

    it("Should prevent non-admin from setting badge URI", async function () {
      await expect(
        badgeToken.connect(user1).setBadgeURI(BADGE_ID_1, "ipfs://test")
      ).to.be.reverted;
    });

    it("Should support multiple custom URIs for different badges", async function () {
      const uri1 = "ipfs://QmBadge1";
      const uri2 = "ipfs://QmBadge2";
      
      await badgeToken.setBadgeURI(BADGE_ID_1, uri1);
      await badgeToken.setBadgeURI(BADGE_ID_2, uri2);
      
      expect(await badgeToken.uri(BADGE_ID_1)).to.equal(uri1);
      expect(await badgeToken.uri(BADGE_ID_2)).to.equal(uri2);
    });

    it("Should fall back to base URI after setting empty custom URI", async function () {
      const customURI = "ipfs://QmCustomBadge1";
      await badgeToken.setBadgeURI(BADGE_ID_1, customURI);
      await badgeToken.setBadgeURI(BADGE_ID_1, "");
      
      expect(await badgeToken.uri(BADGE_ID_1)).to.equal(BASE_URI);
    });
  });

  describe("ERC-1155 Compliance", function () {
    it("Should support ERC1155 interface", async function () {
      // ERC1155 interface ID
      const ERC1155_INTERFACE_ID = "0xd9b67a26";
      const supportsInterface = await badgeToken.supportsInterface(ERC1155_INTERFACE_ID);
      expect(supportsInterface).to.be.true;
    });

    it("Should support AccessControl interface", async function () {
      // AccessControl interface ID
      const ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";
      const supportsInterface = await badgeToken.supportsInterface(ACCESS_CONTROL_INTERFACE_ID);
      expect(supportsInterface).to.be.true;
    });

    it("Should support batch transfers when soulbound is disabled", async function () {
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_2);
      
      await badgeToken
        .connect(user1)
        .safeBatchTransferFrom(
          user1.address,
          user2.address,
          [BADGE_ID_1, BADGE_ID_2],
          [1, 1],
          "0x"
        );
      
      expect(await badgeToken.balanceOf(user2.address, BADGE_ID_1)).to.equal(1);
      expect(await badgeToken.balanceOf(user2.address, BADGE_ID_2)).to.equal(1);
    });

    it("Should block batch transfers when soulbound is enabled", async function () {
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_2);
      await badgeToken.setSoulbound(true);
      
      await expect(
        badgeToken
          .connect(user1)
          .safeBatchTransferFrom(
            user1.address,
            user2.address,
            [BADGE_ID_1, BADGE_ID_2],
            [1, 1],
            "0x"
          )
      ).to.be.revertedWithCustomError(badgeToken, "TransferBlocked");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minting same badge multiple times to same user", async function () {
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      
      // Each mint adds 1, so balance should be 2
      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_1)).to.equal(2);
    });

    it("Should maintain separate balances for different badge IDs", async function () {
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_2);
      
      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_1)).to.equal(2);
      expect(await badgeToken.balanceOf(user1.address, BADGE_ID_2)).to.equal(1);
    });

    it("Should support approval mechanisms", async function () {
      await badgeToken.connect(minter).mint(user1.address, BADGE_ID_1);
      
      await badgeToken.connect(user1).setApprovalForAll(user2.address, true);
      const isApproved = await badgeToken.isApprovedForAll(user1.address, user2.address);
      expect(isApproved).to.be.true;
      
      // user2 can transfer on behalf of user1 when soulbound is disabled
      await badgeToken
        .connect(user2)
        .safeTransferFrom(user1.address, user2.address, BADGE_ID_1, 1, "0x");
      
      const balance = await badgeToken.balanceOf(user2.address, BADGE_ID_1);
      expect(balance).to.equal(1);
    });
  });
});
