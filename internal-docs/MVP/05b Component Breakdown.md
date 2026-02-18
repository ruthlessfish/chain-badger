# 🧩 **Component Breakdown**

Below is the full front‑end architecture, organized by responsibility.

---

# 🟦 **1. Pages**

## **/pages/index.tsx — Landing Page**
**Purpose:** Display available badges + wallet connect  
**Uses:**  
- `<Header />`  
- `<BadgeGrid />`  
- `<BadgeCard />`  
- `<ConnectWalletButton />`  

---

## **/pages/my-badges.tsx — User Inventory**
**Purpose:** Show badges the user owns  
**Uses:**  
- `<Header />`  
- `<OwnedBadgeGrid />`  
- `<OwnedBadgeCard />`  

---

## **/pages/admin.tsx** *(optional but impressive)*  
**Purpose:** Create new badges, update signer  
**Uses:**  
- `<Header />`  
- `<AdminCreateBadgeForm />`  
- `<AdminSignerPanel />`  

---

# 🟩 **2. Global Layout Components**

## **<Header />**
- Logo / project name  
- Navigation links (Home, My Badges, Admin)  
- `<ConnectWalletButton />`  

## **<Footer />** *(optional)*  
- Links to GitHub, explorer, AU project info  

---

# 🟧 **3. Badge Display Components**

## **<BadgeGrid />**
- Displays all available badges  
- Fetches metadata from contract or JSON  
- Renders `<BadgeCard />` for each badge  

## **<BadgeCard />**
- Badge image  
- Title  
- Short description  
- Claim button  
- Opens `<BadgeModal />`  

---

## **<BadgeModal />**
- Large badge image  
- Full description  
- Category, rarity  
- Claim button  
- Loading states  

---

# 🟪 **4. Claim Flow Components**

## **<ClaimButton />**
Handles the entire claim process:
- Requests signature from backend  
- Calls `claimBadge()` on BadgeMinter  
- Shows loading states  
- On success → opens `<ClaimSuccess />`  

---

## **<ClaimProgress />**
Visual stepper:
- Requesting signature  
- Verifying claim  
- Minting badge  
- Success  

---

## **<ClaimSuccess />**
- Large badge image  
- “Badge minted successfully”  
- Link to block explorer  
- Link to My Badges  

---

# 🟫 **5. User Inventory Components**

## **<OwnedBadgeGrid />**
- Reads user’s ERC‑1155 balances  
- Renders `<OwnedBadgeCard />`  

## **<OwnedBadgeCard />**
- Badge image  
- Title  
- Minted date  
- View button  

---

# 🟨 **6. Admin Components (Optional)**

## **<AdminCreateBadgeForm />**
- Title  
- Description  
- Image URL  
- Category  
- Rarity  
- Submit → writes to metadata contract  

## **<AdminSignerPanel />**
- Shows current signer  
- Input to update signer address  

---

# 🟦 **7. Web3 Components / Hooks**

These are the backbone of your dApp.

## **useBadgeContract()**
- Returns BadgeToken contract instance  
- Reads metadata, URIs, balances  

## **useMinterContract()**
- Returns BadgeMinter contract instance  
- Handles claim transactions  

## **useBadgeMetadata()**
- Fetches metadata from JSON or metadata contract  

## **useClaimBadge()**
- Encapsulates full claim flow  
- Handles signature request  
- Handles transaction  
- Returns loading/success/error states  

## **useWallet()**
- Wagmi hook wrapper  
- Connect/disconnect  
- Get address  

---

# 🟩 **8. Utility Modules**

## **/utils/signature.ts**
- Builds EIP‑712 typed data  
- Verifies signatures client‑side (optional)  

## **/utils/badgeList.ts**
- Static list of badge IDs + metadata fallback  

## **/utils/explorer.ts**
- Builds block explorer URLs  

---

# 🟧 **9. Styling System**

**Tailwind + Shadcn**.
