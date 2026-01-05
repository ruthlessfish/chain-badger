// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BadgeToken.sol";
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
    
    /// @notice Address authorized to sign claim messages (backend wallet)
    address public signer;

    /// @notice Tracks which badges have been claimed by each user
    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    /// @notice EIP-712 typehash for Claim struct
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address user,uint256 badgeId)");

    // -------------------------
    // Events
    // -------------------------
    event BadgeClaimed(address indexed user, uint256 indexed badgeId);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    // -------------------------
    // Errors
    // -------------------------
    error AlreadyClaimed();
    error InvalidSignature();
    error InvalidAddress();

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
}
