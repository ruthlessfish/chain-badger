## On‑Chain Achievement Badge System

## 🧱 **1. Contracts Folder Structure**

```
contracts/
│
├── BadgeToken.sol
├── BadgeMinter.sol
├── BadgeMetadata.sol        (optional)
│
├── interfaces/
│   ├── IBadgeToken.sol
│   ├── IBadgeMinter.sol
│   └── IBadgeMetadata.sol
│
└── libraries/
    └── EIP712Helper.sol     (optional helper)
```

---

## 🟦 **2. BadgeToken.sol — Full Code Outline**
#### *ERC‑1155 core contract with soulbound logic + metadata*

```solidity
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
    // State Variables
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
        external
        onlyRole(ADMIN_ROLE);

    function setSoulbound(bool enabled)
        external
        onlyRole(ADMIN_ROLE);

    // -------------------------
    // Minting Logic
    // -------------------------
    function mint(address to, uint256 badgeId)
        external
        onlyRole(MINTER_ROLE);

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
        public
        view
        override
        returns (string memory);
}
```

---

## 🟩 **3. BadgeMinter.sol — Full Code Outline**
#### *Handles EIP‑712 signature verification + secure minting*

```solidity
pragma solidity ^0.8.20;

import "./BadgeToken.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BadgeMinter is EIP712 {
    using ECDSA for bytes32;

    // -------------------------
    // State Variables
    // -------------------------
    BadgeToken public badgeToken;
    address public signer;

    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address user,uint256 badgeId)");

    // -------------------------
    // Events
    // -------------------------
    event BadgeClaimed(address indexed user, uint256 indexed badgeId);
    event SignerUpdated(address indexed newSigner);

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
    function setSigner(address newSigner)
        external;
}
```

---

## 🟧 **4. BadgeMetadata.sol — Full Code Outline (Optional)**  
#### *Dynamic metadata storage + retrieval*

```solidity
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
        external
        onlyOwner;

    // -------------------------
    // Getters
    // -------------------------
    function getBadgeMetadata(uint256 badgeId)
        external
        view
        returns (BadgeInfo memory);
}
```

---

## 🟪 **5. Interfaces — Full Outline**

#### **IBadgeToken.sol**
```solidity
interface IBadgeToken {
    function mint(address to, uint256 badgeId) external;
    function uri(uint256 badgeId) external view returns (string memory);
}
```

#### **IBadgeMinter.sol**
```solidity
interface IBadgeMinter {
    function claimBadge(uint256 badgeId, bytes calldata signature) external;
}
```

#### **IBadgeMetadata.sol**
```solidity
interface IBadgeMetadata {
    function getBadgeMetadata(uint256 badgeId)
        external
        view
        returns (BadgeInfo memory);
}
```

---

## 🟫 **6. Test Suite Outline (Hardhat or Foundry)**

```
test/
│
├── BadgeToken.t.sol
│   - testMinting()
│   - testSoulboundTransfersBlocked()
│   - testURIUpdates()
│   - testRoles()
│
├── BadgeMinter.t.sol
│   - testValidSignatureClaim()
│   - testInvalidSignatureFails()
│   - testReplayProtection()
│   - testSignerUpdate()
│
└── BadgeMetadata.t.sol
    - testSetMetadata()
    - testGetMetadata()
```

---

## 🟨 **7. Deployment Script Outline**

```
scripts/
│
├── deployBadgeToken.js
│   - deploy BadgeToken
│   - assign ADMIN_ROLE
│
├── deployBadgeMinter.js
│   - deploy BadgeMinter
│   - grant MINTER_ROLE
│
└── deployMetadata.js
    - deploy BadgeMetadata
```

---

## 🟦 **8. Front‑End Integration Outline**

```
frontend/
│
├── hooks/
│   ├── useBadgeToken.ts
│   ├── useBadgeMinter.ts
│   └── useClaimBadge.ts
│
├── components/
│   ├── BadgeCard.tsx
│   ├── ClaimModal.tsx
│   ├── ClaimButton.tsx
│   └── BadgeGrid.tsx
│
└── pages/
    ├── index.tsx
    ├── my-badges.tsx
    └── admin.tsx
```

---

## ⭐ Want the **full implementation next**?
I can generate:

- **Full Solidity code for all contracts**  
- **Full test suite**  
- **Full front‑end code**  
- **Deployment scripts**  
- **API route for EIP‑712 signatures**  

Just tell me which part you want to build.
