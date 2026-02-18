// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BadgeToken.sol";
import "./BadgeTemplate.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BadgeMinter
 * @notice Handles template-based badge claims with EIP-712 signature verification
 * @dev Users request a signed claim from the backend, which verifies the template requirements
 *      off-chain. The signature includes a deadline to prevent hoarding. On-chain checks cover
 *      replay protection (hasClaimed), supply caps, template lifecycle, and deadline expiry.
 */
contract BadgeMinter is EIP712, Ownable {
    using ECDSA for bytes32;

    // -------------------------
    // State
    // -------------------------

    /// @notice Reference to the BadgeToken contract
    BadgeToken public badgeToken;

    /// @notice Reference to the BadgeTemplate contract
    BadgeTemplate public badgeTemplate;

    /// @notice Address authorized to sign claim messages (backend wallet)
    address public signer;

    /// @notice Tracks which badge IDs have been claimed by each user
    /// @dev Keyed by badgeId (from the template) rather than templateId so the
    ///      per-wallet uniqueness guarantee works even if templateId changes.
    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    /// @notice EIP-712 typehash for TemplateClaim struct
    /// @dev Includes deadline to prevent signature hoarding / replay after requirement changes
    bytes32 private constant TEMPLATE_CLAIM_TYPEHASH =
        keccak256("TemplateClaim(address user,uint256 templateId,uint256 deadline)");

    // -------------------------
    // Events
    // -------------------------
    event BadgeClaimed(address indexed user, uint256 indexed badgeId);
    event TemplateBadgeClaimed(address indexed user, uint256 indexed templateId, uint256 indexed badgeId);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event BadgeTemplateUpdated(address indexed templateAddress);

    // -------------------------
    // Errors
    // -------------------------
    error AlreadyClaimed();
    error InvalidSignature();
    error InvalidAddress();
    error TemplateNotFound();
    error TemplateNotActive();
    error BadgeTemplateNotSet();
    error SignatureExpired();
    error SupplyCapReached();

    // -------------------------
    // Constructor
    // -------------------------
    /**
     * @notice Initialize the BadgeMinter contract
     * @param badgeTokenAddress Address of the BadgeToken contract
     * @param signerAddress Address authorized to sign claim messages
     * @param initialOwner Address that will own the contract
     */
    constructor(
        address badgeTokenAddress,
        address signerAddress,
        address initialOwner
    )
        EIP712("BadgeMinter", "1")
        Ownable(initialOwner)
    {
        if (badgeTokenAddress == address(0)) revert InvalidAddress();
        if (signerAddress == address(0)) revert InvalidAddress();

        badgeToken = BadgeToken(badgeTokenAddress);
        signer = signerAddress;
    }

    // -------------------------
    // Claim Logic
    // -------------------------

    /**
     * @notice Claim a badge for a template you meet the requirements for
     * @dev The backend verifies requirements off-chain and signs a short-lived EIP-712 payload.
     *      On-chain checks: deadline not expired, template exists and is active, supply cap not
     *      reached, user hasn't already claimed this badge, signature is valid.
     * @param templateId ID of the template to claim a badge from
     * @param deadline Unix timestamp after which the signature is no longer valid
     * @param signature EIP-712 TemplateClaim signature from the authorized signer
     */
    function claimTemplateBadge(
        uint256 templateId,
        uint256 deadline,
        bytes calldata signature
    ) external {
        // 1. Ensure BadgeTemplate is configured
        if (address(badgeTemplate) == address(0)) revert BadgeTemplateNotSet();

        // 2. Check deadline
        if (block.timestamp > deadline) revert SignatureExpired();

        // 3. Load and validate template
        if (!badgeTemplate.templateExists(templateId)) revert TemplateNotFound();

        BadgeTemplate.BadgeTemplateData memory tmpl = badgeTemplate.getTemplate(templateId);

        if (!tmpl.active || tmpl.archived) revert TemplateNotActive();

        // 4. Check supply cap
        if (tmpl.maxClaims > 0) {
            if (badgeTemplate.templateClaimCount(templateId) >= tmpl.maxClaims) {
                revert SupplyCapReached();
            }
        }

        uint256 badgeId = tmpl.badgeId;
        address user = msg.sender;

        // 5. Replay protection (per badge ID, per wallet)
        if (hasClaimed[user][badgeId]) revert AlreadyClaimed();

        // 6. Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(TEMPLATE_CLAIM_TYPEHASH, user, templateId, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = digest.recover(signature);
        if (recoveredSigner != signer) revert InvalidSignature();

        // 7. State changes (CEI — checks and effects before external calls)
        hasClaimed[user][badgeId] = true;

        // 8. Increment claim count on BadgeTemplate
        badgeTemplate.incrementClaimCount(templateId);

        // 9. Mint the badge
        badgeToken.mint(user, badgeId);

        emit BadgeClaimed(user, badgeId);
        emit TemplateBadgeClaimed(user, templateId, badgeId);
    }

    // -------------------------
    // View Functions
    // -------------------------

    /**
     * @notice Get the EIP-712 domain separator
     * @return bytes32 The domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Build the EIP-712 typed data hash for a TemplateClaim (useful for frontend)
     * @param user The address that will submit the claim
     * @param templateId The template being claimed
     * @param deadline Expiry timestamp included in the signature
     * @return bytes32 The digest that the backend should sign
     */
    function getTemplateClaimDigest(
        address user,
        uint256 templateId,
        uint256 deadline
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(TEMPLATE_CLAIM_TYPEHASH, user, templateId, deadline)
        );
        return _hashTypedDataV4(structHash);
    }

    /**
     * @notice Check if a user has claimed a specific badge
     * @param user The user address to check
     * @param badgeId The badge ID to check (not templateId)
     * @return bool True if the badge has been claimed
     */
    function hasUserClaimedBadge(address user, uint256 badgeId)
        external
        view
        returns (bool)
    {
        return hasClaimed[user][badgeId];
    }

    // -------------------------
    // Admin Functions
    // -------------------------

    /**
     * @notice Set the BadgeTemplate contract reference
     * @dev Owner only. Must be called after deploying BadgeTemplate.
     * @param templateAddress Address of the BadgeTemplate contract
     */
    function setBadgeTemplate(address templateAddress) external onlyOwner {
        if (templateAddress == address(0)) revert InvalidAddress();
        badgeTemplate = BadgeTemplate(templateAddress);
        emit BadgeTemplateUpdated(templateAddress);
    }

    /**
     * @notice Update the authorized signer address
     * @param newSigner The new signer address
     */
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidAddress();

        address oldSigner = signer;
        signer = newSigner;

        emit SignerUpdated(oldSigner, newSigner);
    }
}
