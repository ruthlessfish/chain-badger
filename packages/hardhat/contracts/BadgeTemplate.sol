// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BadgeTemplate
 * @notice Manages user-created badge templates with requirements and supply caps
 * @dev Stores template metadata and integrates with BadgeMinter for claiming
 */
contract BadgeTemplate is Ownable {
    // -------------------------
    // Structs
    // -------------------------
    struct BadgeTemplateData {
        address creator;          // Who created this template
        uint256 badgeId;          // Corresponding ERC-1155 token ID
        string metadataURI;       // IPFS/HTTP URI for badge metadata
        bytes requirements;       // ABI-encoded requirements (backend interprets)
        bytes32 requirementsHash; // keccak256(requirements) for integrity checks
        uint8 templateVersion;    // Schema version for requirements encoding
        uint256 maxClaims;        // Supply cap (0 = unlimited)
        bool active;              // Can new claims be made?
        bool archived;            // Permanently retired (can't be reactivated)
        uint256 createdAt;        // Block timestamp
    }

    // -------------------------
    // State
    // -------------------------
    mapping(uint256 => BadgeTemplateData) public templates;      // templateId → data
    mapping(uint256 => uint256) public templateClaimCount;       // templateId → total claims
    mapping(address => uint256[]) private _creatorTemplates;     // creator → templateIds
    
    uint256 public nextTemplateId;                               // Auto-increment
    uint256 public nextBadgeId;                                  // Starts at 1000
    address public authorizedMinter;                             // BadgeMinter address
    
    uint256 public constant TEMPLATE_BADGE_ID_START = 1000;
    uint8 public constant CURRENT_TEMPLATE_VERSION = 1;

    // -------------------------
    // Events
    // -------------------------
    event TemplateCreated(
        uint256 indexed templateId,
        uint256 indexed badgeId,
        address indexed creator,
        string metadataURI,
        bytes32 requirementsHash,
        uint256 maxClaims,
        uint8 templateVersion
    );
    event TemplateDeactivated(uint256 indexed templateId);
    event TemplateReactivated(uint256 indexed templateId);
    event TemplateArchived(uint256 indexed templateId);
    event RequirementsUpdated(uint256 indexed templateId, bytes32 newRequirementsHash);
    event MetadataURIUpdated(uint256 indexed templateId, string newURI);
    event TemplateClaimCountIncremented(uint256 indexed templateId, uint256 newCount);
    event AuthorizedMinterUpdated(address indexed oldMinter, address indexed newMinter);

    // -------------------------
    // Errors
    // -------------------------
    error TemplateNotFound();
    error TemplateNotActive();
    error TemplateArchived();
    error NotTemplateCreator();
    error EmptyMetadataURI();
    error SupplyCapReached();
    error NotAuthorizedMinter();

    // -------------------------
    // Constructor
    // -------------------------
    constructor(address initialOwner) Ownable(initialOwner) {
        nextTemplateId = 0;
        nextBadgeId = TEMPLATE_BADGE_ID_START;
    }

    // -------------------------
    // Template Creation
    // -------------------------
    /**
     * @notice Create a new badge template
     * @param metadataURI IPFS/HTTP URI for badge metadata
     * @param requirements ABI-encoded requirements (backend interprets)
     * @param maxClaims Supply cap (0 = unlimited)
     * @return templateId The ID of the created template
     */
    function createTemplate(
        string calldata metadataURI,
        bytes calldata requirements,
        uint256 maxClaims
    ) external returns (uint256) {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        uint256 templateId = nextTemplateId++;
        uint256 badgeId = nextBadgeId++;
        bytes32 reqHash = keccak256(requirements);

        templates[templateId] = BadgeTemplateData({
            creator: msg.sender,
            badgeId: badgeId,
            metadataURI: metadataURI,
            requirements: requirements,
            requirementsHash: reqHash,
            templateVersion: CURRENT_TEMPLATE_VERSION,
            maxClaims: maxClaims,
            active: true,
            archived: false,
            createdAt: block.timestamp
        });

        _creatorTemplates[msg.sender].push(templateId);

        emit TemplateCreated(
            templateId,
            badgeId,
            msg.sender,
            metadataURI,
            reqHash,
            maxClaims,
            CURRENT_TEMPLATE_VERSION
        );

        return templateId;
    }

    // -------------------------
    // Template Management
    // -------------------------
    /**
     * @notice Deactivate a template (can be reactivated later)
     * @param templateId The template to deactivate
     */
    function deactivateTemplate(uint256 templateId) external {
        BadgeTemplateData storage template = templates[templateId];
        if (template.creator == address(0)) revert TemplateNotFound();
        if (template.creator != msg.sender) revert NotTemplateCreator();
        if (template.archived) revert TemplateArchived();

        template.active = false;
        emit TemplateDeactivated(templateId);
    }

    /**
     * @notice Reactivate a previously deactivated template
     * @param templateId The template to reactivate
     */
    function reactivateTemplate(uint256 templateId) external {
        BadgeTemplateData storage template = templates[templateId];
        if (template.creator == address(0)) revert TemplateNotFound();
        if (template.creator != msg.sender) revert NotTemplateCreator();
        if (template.archived) revert TemplateArchived();

        template.active = true;
        emit TemplateReactivated(templateId);
    }

    /**
     * @notice Permanently archive a template (cannot be undone)
     * @param templateId The template to archive
     */
    function archiveTemplate(uint256 templateId) external {
        BadgeTemplateData storage template = templates[templateId];
        if (template.creator == address(0)) revert TemplateNotFound();
        if (template.creator != msg.sender) revert NotTemplateCreator();

        template.archived = true;
        template.active = false;
        emit TemplateArchived(templateId);
    }

    /**
     * @notice Update template requirements
     * @param templateId The template to update
     * @param requirements New ABI-encoded requirements
     */
    function updateRequirements(uint256 templateId, bytes calldata requirements) external {
        BadgeTemplateData storage template = templates[templateId];
        if (template.creator == address(0)) revert TemplateNotFound();
        if (template.creator != msg.sender) revert NotTemplateCreator();
        if (template.archived) revert TemplateArchived();

        bytes32 newHash = keccak256(requirements);
        template.requirements = requirements;
        template.requirementsHash = newHash;

        emit RequirementsUpdated(templateId, newHash);
    }

    /**
     * @notice Update template metadata URI
     * @param templateId The template to update
     * @param metadataURI New metadata URI
     */
    function updateMetadataURI(uint256 templateId, string calldata metadataURI) external {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();
        
        BadgeTemplateData storage template = templates[templateId];
        if (template.creator == address(0)) revert TemplateNotFound();
        if (template.creator != msg.sender) revert NotTemplateCreator();
        if (template.archived) revert TemplateArchived();

        template.metadataURI = metadataURI;
        emit MetadataURIUpdated(templateId, metadataURI);
    }

    // -------------------------
    // Claim Count Management
    // -------------------------
    /**
     * @notice Increment claim count for a template (called by BadgeMinter)
     * @param templateId The template whose count to increment
     */
    function incrementClaimCount(uint256 templateId) external {
        if (msg.sender != authorizedMinter) revert NotAuthorizedMinter();
        
        uint256 newCount = ++templateClaimCount[templateId];
        emit TemplateClaimCountIncremented(templateId, newCount);
    }

    // -------------------------
    // View Functions
    // -------------------------
    /**
     * @notice Get full template data
     * @param templateId The template to query
     * @return BadgeTemplateData struct
     */
    function getTemplate(uint256 templateId) external view returns (BadgeTemplateData memory) {
        if (templates[templateId].creator == address(0)) revert TemplateNotFound();
        return templates[templateId];
    }

    /**
     * @notice Get all template IDs created by an address
     * @param creator The creator address
     * @return Array of template IDs
     */
    function getTemplatesByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorTemplates[creator];
    }

    /**
     * @notice Get claim count for a template
     * @param templateId The template to query
     * @return Number of claims
     */
    function getTemplateClaimCount(uint256 templateId) external view returns (uint256) {
        return templateClaimCount[templateId];
    }

    /**
     * @notice Check if template is active
     * @param templateId The template to check
     * @return True if active and not archived
     */
    function isTemplateActive(uint256 templateId) external view returns (bool) {
        BadgeTemplateData storage template = templates[templateId];
        return template.active && !template.archived;
    }

    /**
     * @notice Check if template is archived
     * @param templateId The template to check
     * @return True if archived
     */
    function isTemplateArchived(uint256 templateId) external view returns (bool) {
        return templates[templateId].archived;
    }

    /**
     * @notice Check if template is claimable
     * @param templateId The template to check
     * @return True if active, not archived, and under supply cap
     */
    function isTemplateClaimable(uint256 templateId) external view returns (bool) {
        BadgeTemplateData storage template = templates[templateId];
        if (!template.active || template.archived) return false;
        if (template.maxClaims == 0) return true;
        return templateClaimCount[templateId] < template.maxClaims;
    }

    /**
     * @notice Check if template exists
     * @param templateId The template to check
     * @return True if template has been created
     */
    function templateExists(uint256 templateId) external view returns (bool) {
        return templates[templateId].creator != address(0);
    }

    // -------------------------
    // Admin Functions
    // -------------------------
    /**
     * @notice Set the authorized minter address
     * @param minter Address of BadgeMinter contract
     */
    function setAuthorizedMinter(address minter) external onlyOwner {
        address oldMinter = authorizedMinter;
        authorizedMinter = minter;
        emit AuthorizedMinterUpdated(oldMinter, minter);
    }
}
