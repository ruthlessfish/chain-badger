// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BadgeToken
 * @notice ERC-1155 contract for on-chain achievement badges
 * @dev Supports role-based minting, optional soulbound mode, and custom badge URIs
 */
contract BadgeToken is ERC1155, AccessControl {
    // -------------------------
    // Roles
    // -------------------------
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // -------------------------
    // State
    // -------------------------
    /// @notice Controls whether badges are soulbound (non-transferable)
    bool public soulboundEnabled;
    
    /// @notice Custom URIs for individual badge types
    mapping(uint256 => string) private _badgeURIs;

    // -------------------------
    // Events
    // -------------------------
    event BadgeMinted(address indexed to, uint256 indexed badgeId);
    event BadgeURIUpdated(uint256 indexed badgeId, string newURI);
    event SoulboundModeUpdated(bool enabled);

    // -------------------------
    // Errors
    // -------------------------
    error TransferBlocked();
    error InvalidAddress();

    // -------------------------
    // Constructor
    // -------------------------
    /**
     * @notice Initialize the BadgeToken contract
     * @param baseURI Base URI for all token types (can be overridden per badge)
     */
    constructor(string memory baseURI) ERC1155(baseURI) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // -------------------------
    // Admin Functions
    // -------------------------
    /**
     * @notice Set custom URI for a specific badge type
     * @param badgeId The badge ID to update
     * @param newURI The new metadata URI
     */
    function setBadgeURI(uint256 badgeId, string memory newURI)
        external
        onlyRole(ADMIN_ROLE)
    {
        _badgeURIs[badgeId] = newURI;
        emit BadgeURIUpdated(badgeId, newURI);
    }

    /**
     * @notice Enable or disable soulbound mode for all badges
     * @param enabled True to make badges non-transferable
     */
    function setSoulbound(bool enabled)
        external
        onlyRole(ADMIN_ROLE)
    {
        soulboundEnabled = enabled;
        emit SoulboundModeUpdated(enabled);
    }

    // -------------------------
    // Minting
    // -------------------------
    /**
     * @notice Mint a badge to a user (restricted to MINTER_ROLE)
     * @param to The recipient address
     * @param badgeId The badge type to mint
     */
    function mint(address to, uint256 badgeId)
        external
        onlyRole(MINTER_ROLE)
    {
        if (to == address(0)) revert InvalidAddress();
        
        _mint(to, badgeId, 1, "");
        emit BadgeMinted(to, badgeId);
    }

    // -------------------------
    // Soulbound Enforcement
    // -------------------------
    /**
     * @notice Hook to enforce soulbound logic
     * @dev Blocks all transfers when soulbound mode is enabled (except minting)
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        // Allow minting (from == address(0))
        // Block transfers if soulbound is enabled
        if (soulboundEnabled && from != address(0) && to != address(0)) {
            revert TransferBlocked();
        }
        
        super._update(from, to, ids, values);
    }

    // -------------------------
    // Metadata
    // -------------------------
    /**
     * @notice Get metadata URI for a badge
     * @param badgeId The badge ID to query
     * @return The metadata URI (custom or base URI)
     */
    function uri(uint256 badgeId)
        public
        view
        override
        returns (string memory)
    {
        string memory badgeURI = _badgeURIs[badgeId];
        
        // Return custom URI if set, otherwise fall back to base URI
        if (bytes(badgeURI).length > 0) {
            return badgeURI;
        }
        
        return super.uri(badgeId);
    }

    // -------------------------
    // ERC165 Support
    // -------------------------
    /**
     * @notice Check interface support
     * @param interfaceId The interface identifier
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}