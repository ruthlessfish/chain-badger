// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BadgeMetadata
 * @notice Manages dynamic metadata for badge NFTs
 * @dev Allows updating badge information without redeploying BadgeToken
 */
contract BadgeMetadata is Ownable {
    using Strings for uint256;

    // -------------------------
    // Structs
    // -------------------------
    /**
     * @notice Structured metadata for a badge
     * @param name Display name of the badge
     * @param description Detailed description of the achievement
     * @param image IPFS or HTTP URI for the badge image
     * @param category Category/type of achievement (e.g., "Gaming", "DeFi", "Community")
     * @param rarity Rarity level (0 = common, 1 = uncommon, 2 = rare, 3 = epic, 4 = legendary)
     */
    struct BadgeInfo {
        string name;
        string description;
        string image;
        string category;
        uint256 rarity;
    }

    // -------------------------
    // State
    // -------------------------
    /// @notice Mapping of badge ID to its metadata
    mapping(uint256 => BadgeInfo) public badgeData;

    /// @notice Base URI for generating token URIs
    string public baseURI;

    /// @notice Tracks which badges have metadata set
    mapping(uint256 => bool) public badgeExists;

    // -------------------------
    // Constants
    // -------------------------
    string private constant RARITY_COMMON = "Common";
    string private constant RARITY_UNCOMMON = "Uncommon";
    string private constant RARITY_RARE = "Rare";
    string private constant RARITY_EPIC = "Epic";
    string private constant RARITY_LEGENDARY = "Legendary";

    // -------------------------
    // Events
    // -------------------------
    event BadgeMetadataUpdated(uint256 indexed badgeId, string name, string category);
    event BaseURIUpdated(string newBaseURI);
    event BadgeDeleted(uint256 indexed badgeId);

    // -------------------------
    // Errors
    // -------------------------
    error BadgeNotFound();
    error InvalidRarity();
    error EmptyName();

    // -------------------------
    // Constructor
    // -------------------------
    /**
     * @notice Initialize the BadgeMetadata contract
     * @param initialOwner Address that will own the contract
     * @param _baseURI Base URI for metadata (e.g., "https://api.chainbadger.com/metadata/")
     */
    constructor(address initialOwner, string memory _baseURI) 
        Ownable(initialOwner) 
    {
        baseURI = _baseURI;
    }

    // -------------------------
    // Admin Functions
    // -------------------------
    /**
     * @notice Set or update metadata for a badge
     * @param badgeId The badge ID to update
     * @param info The badge metadata struct
     */
    function setBadgeData(uint256 badgeId, BadgeInfo calldata info)
        external
        onlyOwner
    {
        if (bytes(info.name).length == 0) revert EmptyName();
        if (info.rarity > 4) revert InvalidRarity();

        badgeData[badgeId] = info;
        badgeExists[badgeId] = true;

        emit BadgeMetadataUpdated(badgeId, info.name, info.category);
    }

    /**
     * @notice Batch update multiple badges
     * @param badgeIds Array of badge IDs to update
     * @param infos Array of badge metadata (must match badgeIds length)
     */
    function setBadgeDataBatch(
        uint256[] calldata badgeIds,
        BadgeInfo[] calldata infos
    ) external onlyOwner {
        require(badgeIds.length == infos.length, "Length mismatch");
        
        for (uint256 i = 0; i < badgeIds.length; i++) {
            if (bytes(infos[i].name).length == 0) revert EmptyName();
            if (infos[i].rarity > 4) revert InvalidRarity();
            
            badgeData[badgeIds[i]] = infos[i];
            badgeExists[badgeIds[i]] = true;
            
            emit BadgeMetadataUpdated(badgeIds[i], infos[i].name, infos[i].category);
        }
    }

    /**
     * @notice Update the base URI
     * @param newBaseURI The new base URI
     */
    function setBaseURI(string memory newBaseURI)
        external
        onlyOwner
    {
        baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @notice Delete badge metadata
     * @param badgeId The badge ID to delete
     */
    function deleteBadge(uint256 badgeId)
        external
        onlyOwner
    {
        if (!badgeExists[badgeId]) revert BadgeNotFound();
        
        delete badgeData[badgeId];
        badgeExists[badgeId] = false;
        
        emit BadgeDeleted(badgeId);
    }

    // -------------------------
    // Metadata Getters
    // -------------------------
    /**
     * @notice Get complete metadata for a badge
     * @param badgeId The badge ID to query
     * @return BadgeInfo struct with all metadata
     */
    function getBadgeMetadata(uint256 badgeId)
        external
        view
        returns (BadgeInfo memory)
    {
        if (!badgeExists[badgeId]) revert BadgeNotFound();
        return badgeData[badgeId];
    }

    /**
     * @notice Get the metadata URI for a badge
     * @param badgeId The badge ID to query
     * @return string The complete metadata URI
     */
    function getTokenURI(uint256 badgeId)
        external
        view
        returns (string memory)
    {
        if (!badgeExists[badgeId]) revert BadgeNotFound();
        return string(abi.encodePacked(baseURI, badgeId.toString()));
    }

    /**
     * @notice Get human-readable rarity level
     * @param badgeId The badge ID to query
     * @return string The rarity name
     */
    function getBadgeRarity(uint256 badgeId)
        external
        view
        returns (string memory)
    {
        if (!badgeExists[badgeId]) revert BadgeNotFound();
        
        uint256 rarity = badgeData[badgeId].rarity;
        
        if (rarity == 0) return RARITY_COMMON;
        if (rarity == 1) return RARITY_UNCOMMON;
        if (rarity == 2) return RARITY_RARE;
        if (rarity == 3) return RARITY_EPIC;
        if (rarity == 4) return RARITY_LEGENDARY;
        
        revert InvalidRarity();
    }

    /**
     * @notice Get JSON-formatted metadata (for off-chain use)
     * @param badgeId The badge ID to query
     * @return string JSON string with metadata
     */
    function getMetadataJSON(uint256 badgeId)
        external
        view
        returns (string memory)
    {
        if (!badgeExists[badgeId]) revert BadgeNotFound();
        
        BadgeInfo memory info = badgeData[badgeId];
        string memory rarityName = this.getBadgeRarity(badgeId);
        
        return string(
            abi.encodePacked(
                '{"name":"', info.name,
                '","description":"', info.description,
                '","image":"', info.image,
                '","attributes":[',
                '{"trait_type":"Category","value":"', info.category, '"},',
                '{"trait_type":"Rarity","value":"', rarityName, '"},',
                '{"trait_type":"Rarity Level","value":', info.rarity.toString(), '}',
                ']}'
            )
        );
    }

    /**
     * @notice Check if a badge has metadata
     * @param badgeId The badge ID to check
     * @return bool True if metadata exists
     */
    function hasBadgeMetadata(uint256 badgeId)
        external
        view
        returns (bool)
    {
        return badgeExists[badgeId];
    }

    /**
     * @notice Get all badge data fields separately
     * @param badgeId The badge ID to query
     * @return name Badge name
     * @return description Badge description
     * @return image Badge image URI
     * @return category Badge category
     * @return rarity Badge rarity level
     */
    function getBadgeDataFields(uint256 badgeId)
        external
        view
        returns (
            string memory name,
            string memory description,
            string memory image,
            string memory category,
            uint256 rarity
        )
    {
        if (!badgeExists[badgeId]) revert BadgeNotFound();
        
        BadgeInfo memory info = badgeData[badgeId];
        return (
            info.name,
            info.description,
            info.image,
            info.category,
            info.rarity
        );
    }
}
