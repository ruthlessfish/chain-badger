// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BadgeTemplate
 * @notice Permissionless on-chain registry for user-created badge templates
 * @dev Anyone can create a badge template with rules (requirements). The BadgeMinter contract
 *      reads templates during claims and increments the claim count. Requirements are stored as
 *      ABI-encoded bytes so the off-chain backend can decode and evaluate them without requiring
 *      an on-chain verifier.
 */
contract BadgeTemplate is Ownable {
    // -------------------------
    // Types
    // -------------------------

    /**
     * @notice Full data record for a badge template
     * @param creator Address that created this template
     * @param badgeId Corresponding ERC-1155 token ID in BadgeToken
     * @param metadataURI IPFS/HTTP URI pointing to badge metadata JSON
     * @param requirements ABI-encoded Requirements struct (decoded by backend)
     * @param requirementsHash keccak256(requirements) for integrity checks and event indexing
     * @param templateVersion Schema version for requirements encoding (allows backward-compatible decoder updates)
     * @param maxClaims Supply cap — 0 means unlimited
     * @param active Whether new claims are currently accepted
     * @param archived Permanently retired — cannot be reactivated
     * @param createdAt Block timestamp at creation time
     */
    struct BadgeTemplateData {
        address creator;
        uint256 badgeId;
        string metadataURI;
        bytes requirements;
        bytes32 requirementsHash;
        uint8 templateVersion;
        uint256 maxClaims;
        bool active;
        bool archived;
        uint256 createdAt;
    }

    // -------------------------
    // State
    // -------------------------

    /// @notice Current requirements schema version — stamped on every new template
    uint8 public constant CURRENT_TEMPLATE_VERSION = 1;

    /// @notice templateId → template data
    mapping(uint256 => BadgeTemplateData) public templates;

    /// @notice templateId → total number of times a badge has been claimed
    mapping(uint256 => uint256) public templateClaimCount;

    /// @notice creator address → list of templateIds they've created
    mapping(address => uint256[]) private _creatorTemplates;

    /// @notice Next templateId to assign (starts at 0)
    uint256 public nextTemplateId;

    /// @notice Next badgeId to assign (starts at 1 — 0 is reserved)
    uint256 public nextBadgeId;

    /// @notice Address of the BadgeMinter contract, authorized to increment claim counts
    address public authorizedMinter;

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
    event AuthorizedMinterUpdated(address indexed newMinter);

    // -------------------------
    // Errors
    // -------------------------
    error TemplateNotFound();
    error TemplateNotActive();
    error TemplateIsArchived();
    error NotTemplateCreator();
    error EmptyMetadataURI();
    error SupplyCapReached();
    error NotAuthorizedMinter();
    error InvalidAddress();

    // -------------------------
    // Constructor
    // -------------------------
    /**
     * @notice Deploy BadgeTemplate
     * @param initialOwner Address that will own the contract (can set authorizedMinter)
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        nextTemplateId = 0;
        nextBadgeId = 1;
    }

    // -------------------------
    // Modifiers
    // -------------------------

    /// @dev Reverts if the caller is not the template's creator
    modifier onlyTemplateCreator(uint256 templateId) {
        if (!templateExists(templateId)) revert TemplateNotFound();
        if (templates[templateId].creator != msg.sender) revert NotTemplateCreator();
        _;
    }

    /// @dev Reverts if the template is archived
    modifier notArchived(uint256 templateId) {
        if (templates[templateId].archived) revert TemplateIsArchived();
        _;
    }

    // -------------------------
    // Core: Template Creation
    // -------------------------

    /**
     * @notice Create a new badge template
     * @dev Anyone can call. Assigns a sequential templateId and badgeId.
     *      Requirements are stored as opaque bytes — the backend decodes and evaluates them.
     * @param metadataURI IPFS/HTTP URI for badge metadata (name, description, image, etc.)
     * @param requirements ABI-encoded Requirements struct
     * @param maxClaims Supply cap (0 = unlimited)
     * @return templateId The newly assigned template ID
     * @return badgeId The newly assigned ERC-1155 badge ID
     */
    function createTemplate(
        string calldata metadataURI,
        bytes calldata requirements,
        uint256 maxClaims
    ) external returns (uint256 templateId, uint256 badgeId) {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        templateId = nextTemplateId++;
        badgeId = nextBadgeId++;

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
    }

    // -------------------------
    // Creator: Lifecycle Management
    // -------------------------

    /**
     * @notice Temporarily pause new claims on a template
     * @dev Creator only. Reverts if archived. Can be reversed with reactivateTemplate.
     * @param templateId The template to deactivate
     */
    function deactivateTemplate(uint256 templateId)
        external
        onlyTemplateCreator(templateId)
        notArchived(templateId)
    {
        templates[templateId].active = false;
        emit TemplateDeactivated(templateId);
    }

    /**
     * @notice Resume claims on a previously deactivated template
     * @dev Creator only. Reverts if archived.
     * @param templateId The template to reactivate
     */
    function reactivateTemplate(uint256 templateId)
        external
        onlyTemplateCreator(templateId)
        notArchived(templateId)
    {
        templates[templateId].active = true;
        emit TemplateReactivated(templateId);
    }

    /**
     * @notice Permanently retire a template — cannot be undone
     * @dev Creator only. Sets archived = true and active = false. Existing badge holders
     *      keep their badges; no new claims are possible.
     * @param templateId The template to archive
     */
    function archiveTemplate(uint256 templateId)
        external
        onlyTemplateCreator(templateId)
    {
        if (!templateExists(templateId)) revert TemplateNotFound();
        if (templates[templateId].archived) revert TemplateIsArchived();
        templates[templateId].archived = true;
        templates[templateId].active = false;
        emit TemplateArchived(templateId);
    }

    /**
     * @notice Update the encoded requirements for a template
     * @dev Creator only. Recalculates requirementsHash. Reverts if archived.
     *      Note: existing signed claims (before the update) use the old requirements hash.
     *      The backend should invalidate outstanding signatures after an update.
     * @param templateId The template to update
     * @param requirements New ABI-encoded requirements bytes
     */
    function updateRequirements(uint256 templateId, bytes calldata requirements)
        external
        onlyTemplateCreator(templateId)
        notArchived(templateId)
    {
        bytes32 newHash = keccak256(requirements);
        templates[templateId].requirements = requirements;
        templates[templateId].requirementsHash = newHash;
        emit RequirementsUpdated(templateId, newHash);
    }

    /**
     * @notice Update the metadata URI for a template
     * @dev Creator only. Reverts if archived.
     * @param templateId The template to update
     * @param metadataURI New metadata URI
     */
    function updateMetadataURI(uint256 templateId, string calldata metadataURI)
        external
        onlyTemplateCreator(templateId)
        notArchived(templateId)
    {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();
        templates[templateId].metadataURI = metadataURI;
        emit MetadataURIUpdated(templateId, metadataURI);
    }

    // -------------------------
    // Minter: Claim Count
    // -------------------------

    /**
     * @notice Increment the claim count for a template
     * @dev Only callable by the authorizedMinter (BadgeMinter contract).
     *      Called during claimTemplateBadge() after a successful mint.
     * @param templateId The template whose count to increment
     */
    function incrementClaimCount(uint256 templateId) external {
        if (msg.sender != authorizedMinter) revert NotAuthorizedMinter();
        if (!templateExists(templateId)) revert TemplateNotFound();
        uint256 newCount = ++templateClaimCount[templateId];
        emit TemplateClaimCountIncremented(templateId, newCount);
    }

    // -------------------------
    // Owner: Minter Authorization
    // -------------------------

    /**
     * @notice Set the address authorized to call incrementClaimCount
     * @dev Owner only. Should be set to the BadgeMinter contract address post-deploy.
     * @param minter Address of the BadgeMinter contract
     */
    function setAuthorizedMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert InvalidAddress();
        authorizedMinter = minter;
        emit AuthorizedMinterUpdated(minter);
    }

    // -------------------------
    // View Functions
    // -------------------------

    /**
     * @notice Get the full data record for a template
     * @param templateId The template to query
     * @return The BadgeTemplateData struct
     */
    function getTemplate(uint256 templateId) external view returns (BadgeTemplateData memory) {
        if (!templateExists(templateId)) revert TemplateNotFound();
        return templates[templateId];
    }

    /**
     * @notice Get all template IDs created by a specific address
     * @param creator The creator address to query
     * @return Array of template IDs
     */
    function getTemplatesByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorTemplates[creator];
    }

    /**
     * @notice Get the number of times a template badge has been claimed
     * @param templateId The template to query
     * @return Total claim count
     */
    function getTemplateClaimCount(uint256 templateId) external view returns (uint256) {
        return templateClaimCount[templateId];
    }

    /**
     * @notice Check whether a template exists (has been created)
     * @param templateId The template ID to check
     * @return True if created
     */
    function templateExists(uint256 templateId) public view returns (bool) {
        return templateId < nextTemplateId;
    }

    /**
     * @notice Check whether a template is currently active (not deactivated and not archived)
     * @param templateId The template to check
     * @return True if active and not archived
     */
    function isTemplateActive(uint256 templateId) external view returns (bool) {
        if (!templateExists(templateId)) return false;
        return templates[templateId].active && !templates[templateId].archived;
    }

    /**
     * @notice Check whether a template has been permanently archived
     * @param templateId The template to check
     * @return True if archived
     */
    function isTemplateArchived(uint256 templateId) external view returns (bool) {
        if (!templateExists(templateId)) return false;
        return templates[templateId].archived;
    }

    /**
     * @notice Check whether a template can currently accept new claims
     * @dev Returns true only if active, not archived, and under supply cap (if set)
     * @param templateId The template to check
     * @return True if new claims are accepted
     */
    function isTemplateClaimable(uint256 templateId) external view returns (bool) {
        if (!templateExists(templateId)) return false;
        BadgeTemplateData storage t = templates[templateId];
        if (!t.active || t.archived) return false;
        if (t.maxClaims == 0) return true;
        return templateClaimCount[templateId] < t.maxClaims;
    }
}
