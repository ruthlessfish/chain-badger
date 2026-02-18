# 🧱 **1. BadgeToken.sol (ERC‑1155 Core Contract)**  
### *Purpose: Stores badge types, handles minting, enforces soulbound logic.*

```
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract BadgeToken is ERC1155, AccessControl {
    // -------------------------
    // Roles
    // -------------------------
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // -------------------------
    // State
    // -------------------------
    bool public soulboundEnabled;
    mapping(uint256 => string) private _badgeURIs;

    // -------------------------
    // Events
    // -------------------------
    event BadgeMinted(address indexed to, uint256 indexed badgeId);
    event BadgeURIUpdated(uint256 indexed badgeId, string newURI);
    event SoulboundModeUpdated(bool enabled);

    // -------------------------
    // Constructor
    // -------------------------
    constructor(string memory baseURI) ERC1155(baseURI) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // -------------------------
    // Admin Functions
    // -------------------------
    function setBadgeURI(uint256 badgeId, string memory newURI)
        external onlyRole(ADMIN_ROLE);

    function setSoulbound(bool enabled)
        external onlyRole(ADMIN_ROLE);

    // -------------------------
    // Minting
    // -------------------------
    function mint(address to, uint256 badgeId)
        external onlyRole(MINTER_ROLE);

    // -------------------------
    // Soulbound Enforcement
    // -------------------------
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override;

    // -------------------------
    // Metadata
    // -------------------------
    function uri(uint256 badgeId)
        public view override returns (string memory);
}
```

---

# 🟩 **2. BadgeMinter.sol (Signature‑Based Claim Contract)**  
### *Purpose: Verifies EIP‑712 signatures and mints badges securely.*

```
pragma solidity ^0.8.20;

import "./BadgeToken.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BadgeMinter is EIP712 {
    using ECDSA for bytes32;

    // -------------------------
    // State
    // -------------------------
    BadgeToken public badgeToken;
    address public signer; // backend or admin wallet

    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    // EIP-712 typehash
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address user,uint256 badgeId)");

    // -------------------------
    // Events
    // -------------------------
    event BadgeClaimed(address indexed user, uint256 indexed badgeId);

    // -------------------------
    // Constructor
    // -------------------------
    constructor(address badgeTokenAddress, address signerAddress)
        EIP712("BadgeMinter", "1");

    // -------------------------
    // Claim Logic
    // -------------------------
    function claimBadge(uint256 badgeId, bytes calldata signature)
        external;

    function _verifySignature(
        address user,
        uint256 badgeId,
        bytes calldata signature
    ) internal view returns (bool);

    // -------------------------
    // Admin
    // -------------------------
    function setSigner(address newSigner) external;
}
```

---

# 🟧 **3. BadgeMetadata.sol (Optional Dynamic Metadata Resolver)**  
### *Purpose: Allows dynamic or updatable metadata without redeploying BadgeToken.*

```
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BadgeMetadata is Ownable {
    // -------------------------
    // Structs
    // -------------------------
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
    mapping(uint256 => BadgeInfo) public badgeData;

    // -------------------------
    // Events
    // -------------------------
    event BadgeMetadataUpdated(uint256 indexed badgeId);

    // -------------------------
    // Admin
    // -------------------------
    function setBadgeData(uint256 badgeId, BadgeInfo calldata info)
        external onlyOwner;

    // -------------------------
    // Metadata Getter
    // -------------------------
    function getBadgeMetadata(uint256 badgeId)
        external view returns (BadgeInfo memory);
}
```

---

# 🟦 **4. System Interaction Diagram (Text‑Based)**

```
Frontend
   |
   | 1. User clicks "Claim Badge"
   v
Backend (signer)
   |
   | 2. Generates EIP-712 signature
   v
User Wallet
   |
   | 3. Sends signature to BadgeMinter
   v
BadgeMinter.sol
   |
   | 4. Verifies signature
   | 5. Checks replay protection
   | 6. Calls BadgeToken.mint()
   v
BadgeToken.sol
   |
   | 7. Mints ERC-1155 badge
   v
User Wallet receives badge
```

---

# 🟫 **5. Security Considerations (Include in README or Video)**

- Replay protection via `hasClaimed[user][badgeId]`  
- EIP‑712 domain separator prevents cross‑chain signature reuse  
- Only BadgeMinter has `MINTER_ROLE`  
- Soulbound mode prevents badge trading  
- Metadata contract isolated to avoid storage collisions  
- Admin roles separated for safety  

---

# 🟨 **6. Why This Outline Is Strong**

This architecture demonstrates:

- Real‑world EVM patterns  
- Modular contract design  
- Signature verification  
- Access control  
- Metadata management  
- Security awareness  

It’s exactly the kind of structure that makes AU reviewers think:  
**“This developer knows how to build production‑grade Solidity systems.”**

---

If you want, I can now generate:

- **Full code implementation** (all three contracts)  
- **Foundry or Hardhat test suite outline**  
- **Front‑end architecture**  
- **Demo script for your video**  
- **README.md for GitHub**  

Where do you want to go next?
