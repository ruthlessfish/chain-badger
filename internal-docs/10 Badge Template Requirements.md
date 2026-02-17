# ⭐ The High‑Level Architecture

You add a new contract + small backend logic:

### **1. BadgeTemplate.sol (new contract)**
Stores:
- creator (address)
- metadataURI
- requirements (encoded however you want)
- whether it’s active
- which BadgeToken ID it corresponds to

### **2. BadgeMinter.sol (existing)**
Already handles:
- EIP‑712 signature verification  
- replay protection  
- minting ERC‑1155 badges  

You extend it so that:
- A claim request can reference a **templateId**
- The backend verifies the user meets the template’s requirements before signing

### **3. Backend (existing EIP‑712 signer)**
You extend your API route:
- When a user tries to claim a badge from a template:
  - Load the template
  - Check requirements
  - If valid → sign the claim  
  - If invalid → reject

### **4. Frontend**
- User A: “Create Badge Template” screen  
- User B: “Claim Badge” screen (only enabled if requirements met)

---

# ⭐ On‑Chain Data Model

Here’s a clean, minimal contract design that fits your current system:

```solidity
struct BadgeTemplate {
    address creator;
    uint256 badgeId;        // ERC-1155 badge type
    string metadataURI;
    bytes requirements;     // encoded rules (off-chain interpreted)
    bool active;
}
```

Why store `requirements` as `bytes`?
- You can encode anything: JSON, ABI‑encoded struct, bit flags, etc.
- The chain doesn’t need to understand the rules — your backend does.

This keeps gas low and logic flexible.

---

# ⭐ How a Template Is Created (User A)

### On-chain:
User A calls:

```solidity
function createTemplate(
    uint256 badgeId,
    string calldata metadataURI,
    bytes calldata requirements
) external returns (uint256 templateId);
```

This:
- Stores the template
- Emits an event
- Optionally auto‑creates the ERC‑1155 badge type if needed

---

# ⭐ How a Badge Is Claimed (User B)

### Step 1 — User B clicks “Claim”
Frontend sends:
- templateId
- wallet address

### Step 2 — Backend loads template
Backend checks:
- template exists  
- template is active  
- requirements are met  

### Step 3 — Backend signs EIP‑712 payload
Same as your current flow:

```json
{
  "claimer": "0xUserB",
  "badgeId": 12,
  "templateId": 3,
  "nonce": 98123,
  "deadline": 1712345678
}
```

### Step 4 — User submits signature to BadgeMinter
BadgeMinter verifies:
- signature is valid  
- nonce unused  
- badgeId matches template  
- mints badge  

---

# ⭐ Requirements: Where Should They Be Enforced?

You have **three options**, each with different tradeoffs.

---

## **Option A — Off‑chain enforcement (recommended)**  
Backend checks requirements → signs only if valid.

Pros:
- Most flexible  
- Cheapest gas  
- Easy to update rules  
- Works with any data source (API, chain, social, IRL events)

Cons:
- Requires trust in backend (but you already have this with EIP‑712)

This is the best fit for ChainBadger’s architecture.

---

## **Option B — On‑chain enforcement**
You store rules on-chain and enforce them in BadgeMinter.

Pros:
- Fully trustless  
- No backend logic needed

Cons:
- Expensive  
- Hard to update  
- Limited expressiveness

Only worth it if you want *purely on-chain* requirements.

---

## **Option C — Hybrid**
Store rule *definitions* on-chain, but backend interprets them.

Example:
- On-chain: “requires holding token X”
- Backend: checks via RPC before signing

This gives transparency + flexibility.

---

# ⭐ Example Requirements Encoding

You can define a simple ABI struct:

```solidity
struct Requirements {
    address token;
    uint256 minBalance;
    uint256 minXP;
    bool mustFollowCreator;
}
```

Encode it off-chain:

```ts
const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
  ["address", "uint256", "uint256", "bool"],
  [token, minBalance, minXP, mustFollowCreator]
);
```

Store `encoded` in the template.

Backend decodes it and checks the rules.

---

# ⭐ Putting It All Together (Flow Diagram)

### **User A**
1. Creates badge template  
2. Defines requirements  
3. Publishes template  

### **User B**
1. Requests to claim  
2. Backend checks requirements  
3. Backend signs EIP‑712 claim  
4. User submits signature  
5. BadgeMinter verifies + mints  
