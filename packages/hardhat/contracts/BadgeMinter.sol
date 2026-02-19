// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BadgeToken.sol";
import "./BadgeTemplate.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BadgeMinter
 * @notice Handles badge claims with EIP-712 signature verification
 * @dev Prevents replay attacks and integrates with BadgeToken for minting
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

    /// @notice Tracks which badges have been claimed by each user
    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    /// @notice EIP-712 typehash for Claim struct
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address user,uint256 badgeId)");
    
    /// @notice EIP-712 typehash for TemplateClaim struct (includes deadline)
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
     * @notice Claim a badge with a valid signature
     * @param badgeId The ID of the badge to claim
     * @param signature EIP-712 signature from the authorized signer
     */
    function claimBadge(uint256 badgeId, bytes calldata signature)
        external
    {
        address user = msg.sender;
        
        // Check if already claimed
        if (hasClaimed[user][badgeId]) revert AlreadyClaimed();
        
        // Verify signature
        if (!_verifySignature(user, badgeId, signature)) {
            revert InvalidSignature();
        }
        
        // Mark as claimed (prevents replay attacks)
        hasClaimed[user][badgeId] = true;
        
        // Mint the badge
        badgeToken.mint(user, badgeId);
        
        emit BadgeClaimed(user, badgeId);
    }

    /**
     * @notice Verify an EIP-712 signature for a badge claim
     * @param user The address claiming the badge
     * @param badgeId The badge ID being claimed
     * @param signature The signature to verify
     * @return bool True if signature is valid
     */
    function _verifySignature(
        address user,
        uint256 badgeId,
        bytes calldata signature
    ) internal view returns (bool) {
        // Build the EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, user, badgeId)
        );
        
        // Build the typed data hash
        bytes32 digest = _hashTypedDataV4(structHash);
        
        // Recover the signer from the signature
        address recoveredSigner = digest.recover(signature);
        
        // Check if recovered signer matches authorized signer
        return recoveredSigner == signer;
    }

    /**
     * @notice Get the EIP-712 domain separator
     * @return bytes32 The domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Get the typed data hash for a claim (useful for frontend signing)
     * @param user The address claiming the badge
     * @param badgeId The badge ID being claimed
     * @return bytes32 The typed data hash to sign
     */
    function getClaimDigest(address user, uint256 badgeId)
        external
        view
        returns (bytes32)
    {
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, user, badgeId)
        );
        return _hashTypedDataV4(structHash);
    }

    // -------------------------
    // Admin Functions
    // -------------------------
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

    /**
     * @notice Check if a user has claimed a specific badge
     * @param user The user address to check
     * @param badgeId The badge ID to check
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
    // Template Badge Claiming
    // -------------------------
    /**
     * @notice Claim a badge from a template with a valid signature
     * @param templateId The ID of the template to claim from
     * @param deadline Signature expiration timestamp
     * @param signature EIP-712 signature from the authorized signer
     */
    function claimTemplateBadge(
        uint256 templateId,
        uint256 deadline,
        bytes calldata signature
    ) external {
        address user = msg.sender;

        // Verify BadgeTemplate is set
        if (address(badgeTemplate) == address(0)) revert BadgeTemplateNotSet();

        // Verify deadline
        if (block.timestamp > deadline) revert SignatureExpired();

        // Load template
        BadgeTemplate.BadgeTemplateData memory template = badgeTemplate.getTemplate(templateId);

        // Verify template is active
        if (!template.active || template.archived) revert TemplateNotActive();

        // Verify supply cap
        if (template.maxClaims > 0) {
            uint256 claimCount = badgeTemplate.getTemplateClaimCount(templateId);
            if (claimCount >= template.maxClaims) revert SupplyCapReached();
        }

        uint256 badgeId = template.badgeId;

        // Check if already claimed
        if (hasClaimed[user][badgeId]) revert AlreadyClaimed();

        // Verify signature
        if (!_verifyTemplateSignature(user, templateId, deadline, signature)) {
            revert InvalidSignature();
        }

        // Mark as claimed
        hasClaimed[user][badgeId] = true;

        // Increment claim count on template
        badgeTemplate.incrementClaimCount(templateId);

        // Mint the badge
        badgeToken.mint(user, badgeId);

        emit BadgeClaimed(user, badgeId);
        emit TemplateBadgeClaimed(user, templateId, badgeId);
    }

    /**
     * @notice Verify an EIP-712 signature for a template badge claim
     * @param user The address claiming the badge
     * @param templateId The template ID being claimed
     * @param deadline The signature expiration timestamp
     * @param signature The signature to verify
     * @return bool True if signature is valid
     */
    function _verifyTemplateSignature(
        address user,
        uint256 templateId,
        uint256 deadline,
        bytes calldata signature
    ) internal view returns (bool) {
        // Build the EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(TEMPLATE_CLAIM_TYPEHASH, user, templateId, deadline)
        );

        // Build the typed data hash
        bytes32 digest = _hashTypedDataV4(structHash);

        // Recover the signer from the signature
        address recoveredSigner = digest.recover(signature);

        // Check if recovered signer matches authorized signer
        return recoveredSigner == signer;
    }

    /**
     * @notice Get the typed data hash for a template claim (useful for frontend signing)
     * @param user The address claiming the badge
     * @param templateId The template ID being claimed
     * @param deadline The signature expiration timestamp
     * @return bytes32 The typed data hash to sign
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
     * @notice Set the BadgeTemplate contract address
     * @param templateAddress Address of the BadgeTemplate contract
     */
    function setBadgeTemplate(address templateAddress) external onlyOwner {
        badgeTemplate = BadgeTemplate(templateAddress);
        emit BadgeTemplateUpdated(templateAddress);
    }
}
