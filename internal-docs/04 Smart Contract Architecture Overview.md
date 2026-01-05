# 🧱 **Smart Contract Architecture Overview**

Your system will consist of **three modular contracts**, each with a clear responsibility:

1. **BadgeToken.sol** — ERC‑1155 badge contract
2. **BadgeMinter.sol** — signature‑based claim + access control
3. **BadgeMetadata.sol** (optional) — dynamic metadata resolver

This keeps the system clean, upgrade‑friendly, and easy to explain.

---

# 🟦 **1. BadgeToken.sol (Core ERC‑1155 Contract)**

### **Purpose**
Stores all badge types, handles minting, and enforces optional soulbound logic.

### **Key Responsibilities**
- Define badge IDs
- Mint badges (restricted to Minter contract)
- Store metadata URIs or delegate to metadata contract
- Enforce non‑transferability if soulbound mode is enabled
- Emit events for UI indexing

### **Core Functions**
- `mint(address to, uint256 id, uint256 amount)`
- `setURI(uint256 id, string memory newURI)`
- `setSoulbound(bool enabled)`
- Override `safeTransferFrom` to block transfers when soulbound

---

# 🟩 **2. BadgeMinter.sol (Claim + Signature Verification)**

### **Purpose**
Handles badge distribution logic and verifies EIP‑712 signatures.

### **Key Responsibilities**
- Validate signed claims from your backend or admin wallet
- Prevent replay attacks
- Mint badges through the BadgeToken contract
- Enforce claim rules (one‑time claim, allowlists, etc.)

### **Core Functions**
- `claimBadge(uint256 badgeId, bytes calldata signature)`
- `verifySignature(address user, uint256 badgeId, bytes signature)`
- `markClaimed(address user, uint256 badgeId)`

---

# 🟧 **3. BadgeMetadata.sol (Optional Dynamic Metadata)**

### **Purpose**
Allows metadata to be generated or updated off‑chain or dynamically.

### **Key Responsibilities**
- Return metadata URIs based on badge ID
- Support dynamic attributes (rarity, category, timestamp)
- Allow future expansion without redeploying BadgeToken

### **Core Functions**
- `uri(uint256 badgeId)` override
- `setBadgeData(uint256 badgeId, BadgeInfo memory info)`

---

# 🟪 **4. Access Control Pattern**

Use **OpenZeppelin AccessControl** or a simple owner pattern.

### Roles:
- **ADMIN_ROLE** — can create new badges
- **MINTER_ROLE** — only the BadgeMinter contract
- **METADATA_ROLE** — optional metadata updates

---

# 🟫 **5. Data Flow Diagram (Explained Verbally)**

### **User Flow**
1. User clicks “Claim Badge” on the front-end
2. Front-end requests a signed message from your backend
3. User submits signature to BadgeMinter
4. BadgeMinter verifies signature
5. BadgeMinter calls `BadgeToken.mint()`
6. Badge appears in the user’s wallet + UI

---

# 🟨 **6. Security Considerations**

You can mention these in your video to sound like a pro:

- Replay protection via mapping `(user => badgeId => claimed)`
- Signature domain separator prevents cross‑chain reuse
- Only Minter contract can mint
- Optional soulbound prevents badge trading
- Metadata contract is isolated to avoid storage collisions
