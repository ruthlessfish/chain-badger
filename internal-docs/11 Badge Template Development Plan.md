# 🛠️ Badge Template System — Development Plan

> **Goal**: Allow any user to create a badge template with rules, so that other users can claim/mint that badge only if they meet those rules — all built on top of ChainBadger's existing EIP-712 signed minting flow.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Key Design Decisions](#2-key-design-decisions)
3. [Phase 1 — Smart Contracts](#3-phase-1--smart-contracts)
4. [Phase 2 — Deployment & Role Setup](#4-phase-2--deployment--role-setup)
5. [Phase 3 — Backend API](#5-phase-3--backend-api)
6. [Phase 4 — Frontend](#6-phase-4--frontend)
7. [Phase 5 — Testing](#7-phase-5--testing)
8. [Migration & Backward Compatibility](#8-migration--backward-compatibility)
9. [File Inventory](#9-file-inventory)
10. [Sequencing & Dependencies](#10-sequencing--dependencies)

---

## 1. Architecture Overview

### Current System (3 Contracts)

```
BadgeToken (ERC-1155)  ←──MINTER_ROLE──  BadgeMinter (EIP-712)
        │
        └── BadgeMetadata (on-chain metadata)
```

- Admin-only badge creation (badges 1–5 hardcoded in deploy script)
- Backend signs claims → user submits signature → BadgeMinter verifies → BadgeToken mints
- `hasClaimed[user][badgeId]` prevents replays

### Proposed System (4 Contracts)

```
BadgeToken (ERC-1155)  ←──MINTER_ROLE──  BadgeMinter (EIP-712, extended)
        │                                       │
        └── BadgeMetadata                       │ reads templates
                                                │
                                    BadgeTemplate (new)
                                        │
                                    Stores templates,
                                    requirements (bytes),
                                    creator address,
                                    badge ID mapping
```

**Data flow for user-generated badges:**

1. **User A** calls `BadgeTemplate.createTemplate()` → stores template on-chain, assigns a `badgeId`
2. **User B** clicks "Claim" → frontend calls `POST /api/sign-template-claim`
3. Backend loads template from chain → checks requirements → signs EIP-712 payload (now includes `templateId`)
4. **User B** submits signature to `BadgeMinter.claimTemplateBadge(templateId, signature)`
5. BadgeMinter verifies signature + checks `hasClaimed` + reads `BadgeTemplate` for `badgeId` → mints via `BadgeToken.mint()`

---

## 2. Key Design Decisions

### 2.1 Separate Contract vs. Extending BadgeMetadata

**Decision: New `BadgeTemplate.sol` contract.**

| Factor | Extend BadgeMetadata | New Contract |
|--------|---------------------|--------------|
| Separation of concerns | ❌ Mixes display metadata with creation logic | ✅ Clean boundary |
| Redeployment risk | ❌ Requires redeploying metadata (all 5 badges) | ✅ Additive only |
| Access control | ❌ BadgeMetadata is `Ownable` (single admin) | ✅ Permissionless creation |
| Upgrade path | ❌ Coupled | ✅ Independent |

### 2.2 Extending BadgeMinter vs. New Minter Contract

**Decision: Extend `BadgeMinter.sol` — replace the claim path with template-aware claiming.**

Since all badges are now user-generated via templates, the existing `claimBadge(badgeId, signature)` function is no longer needed. It will be replaced by `claimTemplateBadge(templateId, deadline, signature)` as the sole claim path.

- Remove `claimBadge()` and `CLAIM_TYPEHASH` (no admin badges to claim)
- Add `claimTemplateBadge(uint256 templateId, uint256 deadline, bytes signature)`
- Add EIP-712 typehash: `TemplateClaim(address user, uint256 templateId, uint256 deadline)`
- BadgeMinter gets a reference to BadgeTemplate (new state variable + setter)

*Why not a separate minter?* Two minters both needing `MINTER_ROLE` adds operational complexity with no architectural benefit. A single minter is simpler.

### 2.3 Badge ID Assignment Strategy

**Decision: Auto-increment starting from 1.**

- All badges are user-generated via templates — no reserved admin range
- `BadgeTemplate` maintains a `nextBadgeId` counter starting at `1`
- On `createTemplate()`, the contract assigns `badgeId = nextBadgeId++`
- IDs are sequential and never reused

### 2.4 Requirements Enforcement Strategy

**Decision: Option A — Off-chain enforcement (recommended in spec).**

- Requirements stored on-chain as `bytes` (ABI-encoded struct)
- Backend decodes and evaluates requirements before signing
- On-chain storage provides transparency (anyone can read the rules)
- Backend acts as the trusted oracle (already trusted in the EIP-712 model)

*Future upgrade path:* Option C (hybrid) can be added later by having BadgeMinter optionally call an on-chain verifier contract.

### 2.5 Template Metadata Approach

**Decision: Templates store their own `metadataURI` — `BadgeMetadata` becomes optional.**

- Template creators set metadata at creation time via `metadataURI`
- `BadgeMetadata` contract remains deployed but is no longer seeded with data
- `BadgeMetadata` can optionally be used for on-chain rarity/category indexing if needed later
- Frontend reads metadata exclusively from `BadgeTemplate`

### 2.6 Template Versioning

**Decision: Store a `templateVersion` (uint8) on each template, auto-set at creation.**

The `requirements` field is `bytes` — opaque to the contract but decoded by the backend. If the encoding format ever changes (e.g., adding `expiresAt`, `requiredNFT`, or switching to a more compact encoding), the backend must know which decoder to use. Rather than guessing from the bytes length or trying multiple decoders, each template carries an explicit `templateVersion`.

- `CURRENT_TEMPLATE_VERSION` is a contract constant (starts at `1`)
- `createTemplate()` stamps each template with the current version
- Backend switches on `templateVersion` to pick the correct decoder
- Bumping the version only requires updating the constant and deploying a new decoder — old templates remain readable

### 2.7 Supply Caps

**Decision: Optional `maxClaims` field (uint256), where `0` = unlimited.**

Creators often want scarcity:
- "First 100 people only" → `maxClaims = 100`
- "Unlimited, open to everyone" → `maxClaims = 0` (default)
- "One-of-one" → `maxClaims = 1`

Enforcement happens **on-chain** in `BadgeMinter.claimTemplateBadge()` — it reads `templateClaimCount[templateId]` and reverts with `SupplyCapReached()` if the cap is hit. This is critical because supply limits must be trustless; backend-only enforcement could be bypassed.

The per-wallet "one claim per badge" limit is already enforced via `hasClaimed[user][badgeId]`, so `maxClaims` governs the *global* supply across all wallets.

### 2.8 Template Lifecycle (Active vs. Archived)

**Decision: Two-state lifecycle — `active` (toggleable) and `archived` (permanent).**

| State | Claimable? | Reactivatable? | Visible in frontend? |
|-------|-----------|----------------|---------------------|
| `active = true, archived = false` | ✅ Yes | n/a | ✅ Yes |
| `active = false, archived = false` | ❌ No | ✅ Yes | ✅ Yes (greyed out) |
| `archived = true` (any `active`) | ❌ No | ❌ Never | ❌ Hidden |

- **Deactivate**: Temporarily pause claims (e.g., fix a bug, pause for an event). Creator can reactivate later.
- **Archive**: Permanently retire a template. It stays on-chain for transparency (existing badge holders' badges remain valid), but it's hidden from the browse UI and can never accept new claims.

This prevents the "zombie template" problem where old inactive templates clutter the frontend.

### 2.9 Signature Deadlines

**Decision: Add `deadline` (uint256 timestamp) to the `TemplateClaim` EIP-712 struct.**

The existing `Claim(address user, uint256 badgeId)` typehash has no deadline because admin badges are low-risk and the signer is trusted. Template claims are different — they're public, user-generated, and the requirements check happens off-chain. A signature without an expiry could be:

- Hoarded by the user and submitted after they no longer meet requirements
- Replayed after the template creator updates requirements
- Used to front-run a supply cap by accumulating signatures

Adding `deadline` lets the backend issue short-lived signatures (recommended: 10 minutes). The contract checks `block.timestamp <= deadline` before accepting.

---

## 3. Phase 1 — Smart Contracts

### 3.1 New Contract: `BadgeTemplate.sol`

**Location:** `packages/hardhat/contracts/BadgeTemplate.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
```

#### State Variables

```solidity
struct BadgeTemplateData {
    address creator;          // Who created this template
    uint256 badgeId;          // Corresponding ERC-1155 token ID
    string metadataURI;       // IPFS/HTTP URI for badge metadata
    bytes requirements;       // ABI-encoded requirements (backend interprets)
    bytes32 requirementsHash; // keccak256(requirements) for integrity checks + indexing
    uint8 templateVersion;    // Schema version for requirements encoding (future-proofs decoder)
    uint256 maxClaims;        // Supply cap (0 = unlimited)
    bool active;              // Can new claims be made?
    bool archived;            // Permanently retired (can't be reactivated)
    uint256 createdAt;        // Block timestamp
}

mapping(uint256 => BadgeTemplateData) public templates;      // templateId → data
mapping(uint256 => uint256) public templateClaimCount;        // templateId → total claims
uint256 public nextTemplateId;                               // Auto-increment (starts at 0)
uint256 public nextBadgeId;                                  // Auto-increment (starts at 1)

uint8 public constant CURRENT_TEMPLATE_VERSION = 1;
```

**Why `requirementsHash`?** Storing `keccak256(requirements)` alongside the raw bytes is cheap (one extra `SSTORE`) and enables: integrity verification without reading full bytes, subgraph-friendly event indexing, and compact off-chain comparisons.

**Why `templateVersion`?** If the `Requirements` struct format ever changes (e.g., adding an `expiresAt` field), the backend needs to know which decoder to use. The version is set automatically to `CURRENT_TEMPLATE_VERSION` at creation time.

**Why `maxClaims`?** Creators often want scarcity — "first 100 claimers" or "limited edition." A `0` value means unlimited, so existing behavior is the default. Enforced on-chain in `BadgeMinter.claimTemplateBadge()` by reading `templateClaimCount`.

**Why `archived`?** Distinct from `active`. Inactive templates can be reactivated; archived templates cannot. Archived templates remain on-chain for transparency but are hidden from frontend queries. This gives creators a clean "retire" action.

#### Core Functions

| Function | Access | Purpose |
|----------|--------|---------|
| `createTemplate(string metadataURI, bytes requirements, uint256 maxClaims)` | Public | Anyone can create. Assigns templateId + badgeId. Auto-sets `templateVersion` to `CURRENT_TEMPLATE_VERSION` and `requirementsHash` to `keccak256(requirements)`. Emits `TemplateCreated`. |
| `deactivateTemplate(uint256 templateId)` | Creator only | Sets `active = false`. Reverts if archived. Emits `TemplateDeactivated`. |
| `reactivateTemplate(uint256 templateId)` | Creator only | Sets `active = true`. Reverts if archived. Emits `TemplateReactivated`. |
| `archiveTemplate(uint256 templateId)` | Creator only | Sets `archived = true` and `active = false`. Permanent — cannot be undone. Emits `TemplateArchived`. |
| `updateRequirements(uint256 templateId, bytes requirements)` | Creator only | Updates encoded requirements + recalculates `requirementsHash`. Reverts if archived. Emits `RequirementsUpdated`. |
| `updateMetadataURI(uint256 templateId, string metadataURI)` | Creator only | Updates metadata URI. Reverts if archived. Emits `MetadataURIUpdated`. |
| `getTemplate(uint256 templateId)` | View | Returns full `BadgeTemplateData` struct. |
| `getTemplatesByCreator(address creator)` | View | Returns array of templateIds (stored via mapping). |
| `getTemplateClaimCount(uint256 templateId)` | View | Returns `templateClaimCount[templateId]`. |
| `isTemplateActive(uint256 templateId)` | View | Returns `active && !archived`. |
| `isTemplateArchived(uint256 templateId)` | View | Returns `archived` status. |
| `isTemplateClaimable(uint256 templateId)` | View | Returns `active && !archived && (maxClaims == 0 \|\| templateClaimCount < maxClaims)`. |
| `templateExists(uint256 templateId)` | View | Returns whether templateId has been created. |

> **Note on `templateClaimCount`**: This mapping lives on `BadgeTemplate` but is **incremented by `BadgeMinter`** during `claimTemplateBadge()`. BadgeMinter needs write access, so BadgeTemplate exposes an `incrementClaimCount(uint256 templateId)` function restricted to an authorized minter address (set by the contract owner).

#### Events

```solidity
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
```

> **Rationale for richer `TemplateCreated` event**: Emitting `metadataURI`, `requirementsHash`, `maxClaims`, and `templateVersion` makes the event self-contained for subgraph indexers. An indexer can build a full template record from events alone without reading contract storage — critical for analytics dashboards and trending badge feeds.

#### Errors

```solidity
error TemplateNotFound();
error TemplateNotActive();
error TemplateArchived();
error NotTemplateCreator();
error EmptyMetadataURI();
error SupplyCapReached();
error NotAuthorizedMinter();
```

#### Creator Tracking

```solidity
mapping(address => uint256[]) private _creatorTemplates;
```

Each `createTemplate()` call pushes the new templateId to `_creatorTemplates[msg.sender]`.

---

### 3.2 Rewrite of `BadgeMinter.sol`

The existing `claimBadge()` and `CLAIM_TYPEHASH` are removed. `claimTemplateBadge()` becomes the sole claim path. The constructor, signer management, and `hasClaimed` mapping remain.

#### Updated State Variables

```solidity
import "./BadgeTemplate.sol";

/// @notice Reference to the BadgeTemplate contract
BadgeTemplate public badgeTemplate;

/// @notice EIP-712 typehash for TemplateClaim struct (includes deadline for anti-abuse)
bytes32 private constant TEMPLATE_CLAIM_TYPEHASH =
    keccak256("TemplateClaim(address user,uint256 templateId,uint256 deadline)");
```

**Removed:**
- `CLAIM_TYPEHASH` — no longer needed (was `Claim(address user,uint256 badgeId)`)
- `claimBadge()` — replaced by `claimTemplateBadge()`
- `_verifySignature()` — replaced by template-aware verification
- `getClaimDigest()` — replaced by `getTemplateClaimDigest()`

> **Why add `deadline`?** Template claims are user-generated and public — a signature without an expiry could be hoarded and submitted after conditions change. A `deadline` (unix timestamp) lets the backend issue short-lived signatures (e.g., 10 minutes). The `chainId` and `verifyingContract` are already in the EIP-712 domain separator, so they don't need to be in the struct.

#### Functions

##### `claimTemplateBadge(uint256 templateId, uint256 deadline, bytes calldata signature)`

```
1. Verify BadgeTemplate reference is set — revert BadgeTemplateNotSet()
2. Verify deadline has not passed — revert SignatureExpired()
3. Load template from BadgeTemplate
4. Verify template exists — revert TemplateNotFound()
5. Verify template is active and not archived — revert TemplateNotActive()
6. Verify supply cap not reached (if maxClaims > 0, check claimCount < maxClaims) — revert SupplyCapReached()
7. Get badgeId from template
8. Check hasClaimed[user][badgeId] — revert AlreadyClaimed()
9. Verify EIP-712 signature using TEMPLATE_CLAIM_TYPEHASH (user, templateId, deadline)
10. Mark hasClaimed[user][badgeId] = true
11. Increment templateClaimCount via BadgeTemplate.incrementClaimCount(templateId)
12. Call badgeToken.mint(user, badgeId)
13. Emit BadgeClaimed(user, badgeId) + TemplateBadgeClaimed(user, templateId, badgeId)
```

##### `setBadgeTemplate(address templateAddress)`

- `onlyOwner`
- Sets `badgeTemplate` state variable
- Emits `BadgeTemplateUpdated(address)`

##### `getTemplateClaimDigest(address user, uint256 templateId, uint256 deadline)`

- View function for frontend signing
- Returns `_hashTypedDataV4(keccak256(abi.encode(TEMPLATE_CLAIM_TYPEHASH, user, templateId, deadline)))`

#### Events

```solidity
event TemplateBadgeClaimed(address indexed user, uint256 indexed templateId, uint256 indexed badgeId);
event BadgeTemplateUpdated(address indexed templateAddress);
```

> **Note**: The existing `BadgeClaimed` and `SignerUpdated` events are retained.

#### Errors

```solidity
error TemplateNotFound();
error TemplateNotActive();
error BadgeTemplateNotSet();
error SignatureExpired();
error SupplyCapReached();
```

> **Note**: The existing `AlreadyClaimed`, `InvalidSignature`, and `InvalidAddress` errors are retained.

---

### 3.3 No Changes Required

| Contract | Changes? | Reason |
|----------|----------|--------|
| `BadgeToken.sol` | ❌ None | Already supports arbitrary badge IDs via `mint()`. Works out of the box. |
| `BadgeMetadata.sol` | ❌ None | Stays deployed but unseeded. Available for optional on-chain indexing later. |

---

## 4. Phase 2 — Deployment & Role Setup

### 4.1 New Deployment Script

**File:** `packages/hardhat/deploy/06_deploy_badge_template.ts`

```
- Deploy BadgeTemplate (no constructor args needed beyond optional owner)
- Tag: ["BadgeTemplate", "Badges"]
- No dependencies (standalone contract)
```

### 4.2 Updated Role Setup Script

**File:** `packages/hardhat/deploy/07_setup_template_roles.ts`

```
- Call BadgeMinter.setBadgeTemplate(badgeTemplateAddress)
- runAtTheEnd: true
- Dependencies: ["BadgeMinter", "BadgeTemplate"]
- Tag: ["BadgeSetup", "Badges"]
```

### 4.3 Redeployment of BadgeMinter

Since `BadgeMinter.sol` is modified, it needs to be redeployed. The deployment script `01_deploy_badge_minter.ts` will handle this automatically on next `yarn deploy`. The role setup in `03_setup_roles.ts` will re-grant `MINTER_ROLE` to the new address.

**Important:** The `BadgeMinter` constructor does **not** take `BadgeTemplate` as a constructor arg — it's set via `setBadgeTemplate()` post-deploy. This keeps the constructor backward-compatible and avoids circular deploy dependencies.

---

## 5. Phase 3 — Backend API

### 5.1 New API Route: `/api/sign-template-claim`

**File:** `packages/nextjs/app/api/sign-template-claim/route.ts`

**Method:** `POST`

**Request Body:**
```json
{
  "user": "0x...",
  "templateId": 3,
  "chainId": 31337,
  "verifyingContract": "0x..."
}
```

**Logic:**
1. Load template from chain via `BadgeTemplate.getTemplate(templateId)`
2. Validate template exists, is active, and is not archived
3. Validate supply cap not reached (`maxClaims == 0 || claimCount < maxClaims`)
4. Decode `requirements` bytes → `Requirements` struct (using `templateVersion` to select decoder)
5. **Evaluate each requirement:**
   - `token` + `minBalance` → call `ERC20.balanceOf(user)` via RPC
   - `minXP` → call external API or check on-chain counter
   - `mustFollowCreator` → check social API (or skip for MVP)
6. Compute `deadline` = `now + 10 minutes` (configurable via env var `SIGNATURE_TTL_SECONDS`)
7. If all requirements pass → sign EIP-712 payload:
   ```json
   {
     "types": { "TemplateClaim": [
       { "name": "user", "type": "address" },
       { "name": "templateId", "type": "uint256" },
       { "name": "deadline", "type": "uint256" }
     ]},
     "message": { "user": "0x...", "templateId": 3, "deadline": 1712345678 }
   }
   ```
8. Return `{ signature, message, signer, templateId, badgeId, deadline }`

**Error Responses:**
- `400` — Missing fields
- `403` — Requirements not met (include which ones failed + current vs. required values)
- `404` — Template not found, inactive, or archived
- `409` — Supply cap reached
- `500` — Signing error

### 5.2 New API Route: `/api/templates`

**File:** `packages/nextjs/app/api/templates/route.ts`

**Method:** `GET`

**Purpose:** Fetch all active templates for the frontend grid. While templates are on-chain, reading many templates individually is slow. This route batches the reads and caches results.

**Query Params:** `?creator=0x...` (optional filter)

**Response:**
```json
{
  "templates": [
    {
      "templateId": 0,
      "badgeId": 1000,
      "creator": "0x...",
      "metadataURI": "ipfs://...",
      "requirements": { "token": "0x...", "minBalance": "100", "minXP": "0", "mustFollowCreator": false },
      "requirementsHash": "0xabc123...",
      "templateVersion": 1,
      "maxClaims": 100,
      "claimCount": 42,
      "active": true,
      "archived": false,
      "createdAt": 1712345678
    }
  ]
}
```

> **Note**: The `GET` route filters out `archived` templates by default. Pass `?includeArchived=true` to include them (useful for creator dashboards).

### 5.3 Requirements Decoder Utility

**File:** `packages/nextjs/utils/requirementsDecoder.ts`

Shared utility for encoding/decoding the `Requirements` struct:

```typescript
interface Requirements {
  token: string;        // Address (zero address = no token requirement)
  minBalance: bigint;   // Minimum token balance (0 = no requirement)
  minXP: bigint;        // Minimum XP/points (0 = no requirement)
  mustFollowCreator: boolean;
}

function encodeRequirements(req: Requirements): `0x${string}` { ... }
function decodeRequirements(data: `0x${string}`): Requirements { ... }
```

This utility is used by both the frontend (template creation form) and backend (requirement evaluation).

---

## 6. Phase 4 — Frontend

### 6.1 New Pages

#### `/create-template` — Template Creation Page

**File:** `packages/nextjs/app/create-template/page.tsx`

**Components:**
- `<CreateTemplateForm />` — Multi-step form
  - Step 1: Badge details (name, description, image upload/URI, category, rarity)
  - Step 2: Requirements builder (token gate, min balance, XP threshold, social follow)
  - Step 3: Supply settings (max claims — 0 for unlimited, or a specific cap)
  - Step 4: Preview + confirm
  - Step 5: Submit transaction to `BadgeTemplate.createTemplate()`
- `<RequirementsBuilder />` — Interactive form for setting requirements
  - Token address input (with validation)
  - Min balance slider/input
  - XP threshold input
  - Toggle switches for boolean requirements
- `<TemplatePreview />` — Shows how the badge will appear to claimers

**Scaffold-ETH integration:**
```typescript
const { writeContractAsync } = useScaffoldWriteContract({ contractName: "BadgeTemplate" });
await writeContractAsync({
  functionName: "createTemplate",
  args: [metadataURI, encodedRequirements, maxClaims],
});
```

#### `/templates` — Browse All Templates

**File:** `packages/nextjs/app/templates/page.tsx`

**Components:**
- `<TemplateGrid />` — Grid of all active templates
- `<TemplateCard />` — Individual template with:
  - Badge image + name
  - Creator address
  - Requirements summary (decoded from bytes)
  - Supply indicator ("42 / 100 claimed" or "∞ Unlimited")
  - "Claim" button (disabled if not eligible, sold out, or archived)
  - Claim count / popularity indicator
- `<TemplateFilters />` — Filter by category, creator, requirement type

#### `/templates/[templateId]` — Template Detail Page

**File:** `packages/nextjs/app/templates/[templateId]/page.tsx`

**Components:**
- `<TemplateDetail />` — Full template information
- `<RequirementsList />` — Decoded requirements with pass/fail indicators per connected user
- `<TemplateClaimButton />` — Full claim flow:
  1. Check requirements client-side (preview)
  2. Request signature + deadline from `/api/sign-template-claim`
  3. Submit to `BadgeMinter.claimTemplateBadge(templateId, deadline, signature)`
  4. Show success + badge in wallet

### 6.2 Updated Existing Pages

#### Home Page (`/`)

Replace the existing `<BadgeGrid />` (which shows hardcoded badges 1–5) with `<TemplateGrid />`:
- Show latest community-created templates
- "Create a Badge →" CTA for template creation
- "View All →" link to `/templates`

#### My Badges (`/my-badges`)

- Rewrite `<OwnedBadgeGrid />` to discover owned badges via `TemplateBadgeClaimed` events (filtered by connected user) rather than hardcoded IDs
- Show "Created by [address]" attribution for each badge
- Link each badge back to its template detail page

### 6.3 New Hooks

#### `useTemplates()`

**File:** `packages/nextjs/hooks/chainbadger/useTemplates.ts`

```typescript
// Reads all templates from BadgeTemplate contract
// Returns { templates: Template[], loading, refetch }
// Uses useScaffoldReadContract for each template + batch optimization
```

#### `useTemplateEligibility(templateId, userAddress)`

**File:** `packages/nextjs/hooks/chainbadger/useTemplateEligibility.ts`

```typescript
// Client-side preview of whether user likely meets requirements
// Checks token balances via wagmi useReadContract
// Returns { eligible: boolean, checks: EligibilityCheck[], loading }
```

#### `useTemplateClaim(templateId)`

**File:** `packages/nextjs/hooks/chainbadger/useTemplateClaim.ts`

```typescript
// Full claim flow:
// 1. Fetch signature + deadline from /api/sign-template-claim
// 2. Submit to BadgeMinter.claimTemplateBadge(templateId, deadline, signature)
// Returns { claim: () => Promise<void>, isPending, isSuccess, error }
```

### 6.4 New Components

**Directory:** `packages/nextjs/components/chainbadger/templates/`

| Component | Purpose |
|-----------|---------|
| `TemplateGrid.tsx` | Grid layout for template cards |
| `TemplateCard.tsx` | Individual template card with claim action |
| `TemplateDetail.tsx` | Full template view |
| `TemplateClaimButton.tsx` | Handles sign-request → submit → confirmation flow |
| `CreateTemplateForm.tsx` | Multi-step template creation form |
| `RequirementsBuilder.tsx` | Interactive requirements editor |
| `RequirementsList.tsx` | Displays decoded requirements with status |
| `TemplatePreview.tsx` | Preview of badge before publishing |
| `TemplateFilters.tsx` | Filter/search controls for template grid |
| `EligibilityIndicator.tsx` | Pass/fail badge per requirement |
| `SupplyIndicator.tsx` | Shows "42 / 100 claimed" or "∞ Unlimited" progress bar |
| `TemplateStatusBadge.tsx` | Renders `TemplateStatus` as colored pill (Claimable / Paused / Sold Out / Archived) |

### 6.5 Updated Types

**File:** `packages/nextjs/types/badge.ts` (extend)

```typescript
interface Requirements {
  token: string;
  minBalance: bigint;
  minXP: bigint;
  mustFollowCreator: boolean;
}

interface BadgeTemplate {
  templateId: bigint;
  badgeId: bigint;
  creator: string;
  metadataURI: string;
  requirements: Requirements;
  requirementsHash: string;
  templateVersion: number;
  maxClaims: bigint;
  claimCount: bigint;
  active: boolean;
  archived: boolean;
  createdAt: bigint;
}

interface EligibilityCheck {
  requirement: string;    // Human-readable description
  passed: boolean;
  current?: string;       // Current value (e.g., "50 TOKENS")
  required?: string;      // Required value (e.g., "100 TOKENS")
}

type TemplateStatus = "claimable" | "paused" | "sold-out" | "archived";
```

---

## 7. Phase 5 — Testing

### 7.1 Smart Contract Tests

#### `test/BadgeTemplate.ts`

| Test Group | Cases |
|-----------|-------|
| **Deployment** | Initial state, nextTemplateId = 0, nextBadgeId = 1, CURRENT_TEMPLATE_VERSION = 1 |
| **Template Creation** | Anyone can create, auto-assigns IDs, emits enriched `TemplateCreated` (metadataURI, requirementsHash, maxClaims, templateVersion), stores all fields correctly, multiple creators, `requirementsHash` matches `keccak256(requirements)`, `templateVersion` matches `CURRENT_TEMPLATE_VERSION` |
| **Supply Caps** | `maxClaims = 0` means unlimited, `maxClaims = 100` stored correctly, `isTemplateClaimable()` returns false when cap reached, `getTemplateClaimCount()` tracks correctly |
| **Template Management** | Creator can deactivate/reactivate, non-creator reverts with `NotTemplateCreator`, update requirements recalculates `requirementsHash`, update metadata URI, all management functions revert on archived templates |
| **Archiving** | Creator can archive, archived template cannot be reactivated (`TemplateArchived` error), archived template cannot be updated, `isTemplateArchived()` returns correct state, `isTemplateClaimable()` returns false for archived |
| **View Functions** | `getTemplate()` returns correct data, `getTemplatesByCreator()` returns all templates, `isTemplateActive()` returns `active && !archived`, `templateExists()`, `isTemplateClaimable()` checks active + archived + supply cap, non-existent template reverts |
| **Badge ID Assignment** | First template gets badgeId 1, sequential assignment, IDs never reused |
| **Claim Count** | `incrementClaimCount()` only callable by authorized minter, increments correctly, emits `TemplateClaimCountIncremented`, non-authorized caller reverts |
| **Edge Cases** | Empty metadata URI reverts, very large requirements bytes, template at ID 0, `maxClaims = 1` (one-of-one) |

#### `test/BadgeMinter.ts` (rewrite)

| Test Group | Cases |
|-----------|-------|
| **Deployment** | Correct BadgeToken address, signer, owner; reverts on zero addresses |
| **Template Integration** | `setBadgeTemplate()` by owner, non-owner reverts, zero address reverts |
| **Template Claiming** | Valid signature mints correct badgeId, emits `TemplateBadgeClaimed`, marks `hasClaimed`, replay protection, increments `templateClaimCount` on BadgeTemplate |
| **Signature Deadlines** | Accepts signature before deadline, rejects expired signature (`SignatureExpired`), deadline of 0 rejects immediately, deadline far in the future works |
| **Supply Caps** | Claim succeeds under cap, reverts with `SupplyCapReached` when cap hit, unlimited (`maxClaims = 0`) never reverts for supply, one-of-one (`maxClaims = 1`) allows exactly one claim |
| **Template Validation** | Reverts if template not found, reverts if template not active, reverts if template is archived, reverts if BadgeTemplate not set |
| **EIP-712 Template Signatures** | Correct typehash includes deadline, correct digest, rejects wrong templateId, rejects wrong user, rejects wrong deadline |
| **Admin Functions** | Owner can update signer, emits `SignerUpdated`, non-owner can't update, zero address reverts |

### 7.2 API Route Tests

Manual testing via `curl` or Postman for MVP. Future: add Jest/Vitest tests.

```bash
# Create template on-chain first, then:
curl -X POST http://localhost:3000/api/sign-template-claim \
  -H "Content-Type: application/json" \
  -d '{"user":"0x...","templateId":0,"chainId":31337,"verifyingContract":"0x..."}'

# Response includes deadline — pass it to the contract:
# { "signature": "0x...", "deadline": 1712345678, ... }
```

### 7.3 Frontend Testing

- Component rendering with mock data
- Claim flow integration test (local Hardhat node)
- Requirements builder encodes correctly
- Eligibility checks display correctly

---

## 8. Pre-Work Cleanup

Before starting template development, remove the legacy admin-badge scaffolding. All badges will be user-generated via templates — there is no admin badge range.

### Files to Delete

| File | Reason |
|------|--------|
| `packages/hardhat/deploy/05_setup_badge_metadata.ts` | Seeds badges 1–5. No longer needed. |
| `packages/nextjs/app/api/sign-claim/route.ts` | Signs admin badge claims. Replaced by `/api/sign-template-claim`. |
| `packages/nextjs/app/api/verify-game-achievement/route.ts` | Mock game verification for admin badges. Can be re-added as a template requirement type later. |

### Files to Gut / Rewrite

| File | Change |
|------|--------|
| `packages/nextjs/hooks/chainbadger/useBadges.ts` | Currently hardcodes reads for badge IDs 1–5. Replace with `useTemplates` hook (Phase 4). Delete this file. |
| `packages/nextjs/components/chainbadger/BadgeGrid.tsx` | Renders hardcoded badges from `useBadges`. Replace with `TemplateGrid`. Delete this file. |
| `packages/nextjs/components/chainbadger/BadgeCard.tsx` | Tied to admin badge data shape. Replace with `TemplateCard`. Delete this file. |
| `packages/nextjs/components/chainbadger/ClaimButton.tsx` | Calls `/api/sign-claim`. Replace with `TemplateClaimButton`. Delete this file. |
| `packages/nextjs/app/page.tsx` | Rewrite to show template grid instead of hardcoded `<BadgeGrid />`. |
| `packages/nextjs/app/my-badges/page.tsx` | Rewrite `<OwnedBadgeGrid />` to query badges by template ownership. |
| `packages/hardhat/contracts/BadgeMinter.sol` | Remove `claimBadge()` + `CLAIM_TYPEHASH`. Replace with `claimTemplateBadge()`. |
| `packages/hardhat/test/BadgeMinter.ts` | Remove tests for `claimBadge()`. Replace with `claimTemplateBadge()` tests. |

### Contracts That Stay As-Is

| Contract | Status |
|----------|--------|
| `BadgeToken.sol` | ✅ No changes — already supports arbitrary badge IDs |
| `BadgeMetadata.sol` | ✅ No changes — stays deployed but unseeded. Available for optional on-chain indexing later. |

### Deployment Scripts That Stay

| Script | Status |
|--------|--------|
| `00_deploy_badge_token.ts` | ✅ Keep |
| `01_deploy_badge_minter.ts` | ✅ Keep (deploys updated BadgeMinter) |
| `02_deploy_badge_metadata.ts` | ✅ Keep (contract still useful, just not seeded) |
| `03_setup_roles.ts` | ✅ Keep (grants MINTER_ROLE) |
| `04_deployment_summary.ts` | ✅ Keep (update to include BadgeTemplate info) |

---

## 9. File Inventory

### New Files

| File | Type | Phase |
|------|------|-------|
| `packages/hardhat/contracts/BadgeTemplate.sol` | Contract | 1 |
| `packages/hardhat/deploy/06_deploy_badge_template.ts` | Deploy | 2 |
| `packages/hardhat/deploy/07_setup_template_roles.ts` | Deploy | 2 |
| `packages/hardhat/test/BadgeTemplate.ts` | Test | 5 |
| `packages/nextjs/app/api/sign-template-claim/route.ts` | API | 3 |
| `packages/nextjs/app/api/templates/route.ts` | API | 3 |
| `packages/nextjs/app/create-template/page.tsx` | Page | 4 |
| `packages/nextjs/app/templates/page.tsx` | Page | 4 |
| `packages/nextjs/app/templates/[templateId]/page.tsx` | Page | 4 |
| `packages/nextjs/hooks/chainbadger/useTemplates.ts` | Hook | 4 |
| `packages/nextjs/hooks/chainbadger/useTemplateEligibility.ts` | Hook | 4 |
| `packages/nextjs/hooks/chainbadger/useTemplateClaim.ts` | Hook | 4 |
| `packages/nextjs/components/chainbadger/templates/TemplateGrid.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/TemplateCard.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/TemplateDetail.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/TemplateClaimButton.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/CreateTemplateForm.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/RequirementsBuilder.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/RequirementsList.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/TemplatePreview.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/TemplateFilters.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/EligibilityIndicator.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/SupplyIndicator.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/TemplateStatusBadge.tsx` | Component | 4 |
| `packages/nextjs/components/chainbadger/templates/index.ts` | Barrel | 4 |
| `packages/nextjs/utils/requirementsDecoder.ts` | Utility | 3 |

### Modified Files

| File | Changes | Phase |
|------|---------|-------|
| `packages/hardhat/contracts/BadgeMinter.sol` | Remove `claimBadge()`, add `claimTemplateBadge()` + template state | 1 |
| `packages/hardhat/test/BadgeMinter.ts` | Replace `claimBadge` tests with `claimTemplateBadge` tests | 5 |
| `packages/hardhat/deploy/04_deployment_summary.ts` | Add BadgeTemplate to summary output | 2 |
| `packages/nextjs/types/badge.ts` | Add `Requirements`, `BadgeTemplate`, `EligibilityCheck`, `TemplateStatus` types | 3 |
| `packages/nextjs/app/page.tsx` | Replace `<BadgeGrid />` with `<TemplateGrid />` | 4 |
| `packages/nextjs/app/my-badges/page.tsx` | Rewrite to use template-aware badge ownership | 4 |
| `packages/nextjs/components/Header.tsx` | Add nav links for `/templates`, `/create-template` | 4 |

### Files to Delete (Phase 0 — Pre-Work Cleanup)

| File | Reason |
|------|--------|
| `packages/hardhat/deploy/05_setup_badge_metadata.ts` | Seeded admin badges 1–5 |
| `packages/nextjs/app/api/sign-claim/route.ts` | Admin badge signing (replaced by `/api/sign-template-claim`) |
| `packages/nextjs/app/api/verify-game-achievement/route.ts` | Mock game verification for admin badges |
| `packages/nextjs/hooks/chainbadger/useBadges.ts` | Hardcoded reads for badges 1–5 (replaced by `useTemplates`) |
| `packages/nextjs/components/chainbadger/BadgeGrid.tsx` | Hardcoded admin badge grid (replaced by `TemplateGrid`) |
| `packages/nextjs/components/chainbadger/BadgeCard.tsx` | Admin badge card (replaced by `TemplateCard`) |
| `packages/nextjs/components/chainbadger/ClaimButton.tsx` | Admin claim flow (replaced by `TemplateClaimButton`) |

---

## 10. Sequencing & Dependencies

### Implementation Order

```
Phase 0 (Cleanup) ───────────────────────────────────────────
  │
  ├─ 0a. Delete 05_setup_badge_metadata.ts
  ├─ 0b. Delete /api/sign-claim, /api/verify-game-achievement
  ├─ 0c. Delete useBadges, BadgeGrid, BadgeCard, ClaimButton
  ├─ 0d. Stub out page.tsx and my-badges/page.tsx (remove broken imports)
  │
Phase 1 ─────────────────────────────────────────────────────
  │
  ├─ 1a. Write BadgeTemplate.sol
  ├─ 1b. Rewrite BadgeMinter.sol (remove claimBadge, add claimTemplateBadge)
  │
Phase 2 ─────────────────────────────────────────────────────
  │
  ├─ 2a. Write 06_deploy_badge_template.ts
  ├─ 2b. Write 07_setup_template_roles.ts (depends on 2a)
  ├─ 2c. Update 04_deployment_summary.ts
  ├─ 2d. Run yarn deploy — verify all contracts deploy correctly
  │
Phase 3 ─────────────────────────────────────────────────────
  │
  ├─ 3a. Write requirementsDecoder.ts utility
  ├─ 3b. Write /api/sign-template-claim route (depends on 3a)
  ├─ 3c. Write /api/templates route
  ├─ 3d. Add types to badge.ts
  │
Phase 4 ─────────────────────────────────────────────────────
  │
  ├─ 4a. Write hooks (useTemplates, useTemplateEligibility, useTemplateClaim)
  ├─ 4b. Write template components (depends on 4a)
  ├─ 4c. Write /create-template page (depends on 4a, 4b)
  ├─ 4d. Write /templates page + [templateId] detail (depends on 4a, 4b)
  ├─ 4e. Rewrite home page + my-badges with template components
  ├─ 4f. Update Header nav
  │
Phase 5 ─────────────────────────────────────────────────────
  │
  ├─ 5a. Write BadgeTemplate.ts tests
  ├─ 5b. Rewrite BadgeMinter.ts tests (claimTemplateBadge only)
  ├─ 5c. Integration test: full create → claim flow on local node
  └─ 5d. Frontend smoke test: create template → browse → claim → view in my-badges
```

### Estimated Effort

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 0 | Cleanup (delete legacy files, stub pages) | 0.5 day |
| Phase 1 | Smart contracts | 1–2 days |
| Phase 2 | Deployment scripts | 0.5 day |
| Phase 3 | Backend API + utilities | 1 day |
| Phase 4 | Frontend pages + components | 3–4 days |
| Phase 5 | Testing | 2–3 days |
| **Total** | | **~8–11 days** |

### Critical Path

```
BadgeTemplate.sol → BadgeMinter.sol changes → Deploy scripts → yarn deploy succeeds
    → API routes work → Frontend can create + claim
```

The smart contract + deploy phase is the critical path. Frontend and tests can be parallelized once contracts compile and deploy.

---

## Appendix A: Requirements Struct (Reference)

The initial `Requirements` struct supports four rule types. This is intentionally minimal — new fields can be added by extending the struct and updating the encoder/decoder.

```solidity
struct Requirements {
    address token;           // ERC-20 token address (address(0) = no token gate)
    uint256 minBalance;      // Minimum token balance required
    uint256 minXP;           // Minimum XP/points (app-specific)
    bool mustFollowCreator;  // Social requirement (checked off-chain)
}
```

**Encoding (frontend/backend):**
```typescript
const encoded = new AbiCoder().encode(
  ["address", "uint256", "uint256", "bool"],
  [token, minBalance, minXP, mustFollowCreator]
);
```

**Decoding (backend):**
```typescript
const [token, minBalance, minXP, mustFollowCreator] = new AbiCoder().decode(
  ["address", "uint256", "uint256", "bool"],
  encoded
);
```

---

## Appendix B: EIP-712 Type Definitions

### Claim Type (template claims)
```
TemplateClaim(address user, uint256 templateId, uint256 deadline)
```

The `deadline` field is a unix timestamp. The backend sets it to `now + SIGNATURE_TTL_SECONDS` (default: 600 = 10 minutes). The contract checks `block.timestamp <= deadline` before processing the claim.

> **Note**: The previous `Claim(address user, uint256 badgeId)` typehash is removed. All claims now go through `TemplateClaim`.

Domain:
```json
{
  "name": "BadgeMinter",
  "version": "1",
  "chainId": "<network chain ID>",
  "verifyingContract": "<BadgeMinter address>"
}
```

---

## Appendix C: Gas Considerations

| Operation | Estimated Gas | Notes |
|-----------|--------------|-------|
| `createTemplate()` | ~100,000–140,000 | Storage writes (struct + requirementsHash + creator tracking) + event with rich data |
| `claimTemplateBadge()` | ~100,000–120,000 | Deadline check + signature verify + supply cap check + external call to increment claimCount + mint |
| `deactivateTemplate()` | ~30,000 | Single storage write |
| `archiveTemplate()` | ~35,000 | Two storage writes (archived + active) |
| `incrementClaimCount()` | ~25,000 | Single storage increment + event |

The `requirementsHash` computation (`keccak256`) costs ~30 gas per 32-byte word — negligible. The `templateVersion` and `maxClaims` fields add one `SSTORE` each at creation (~20,000 gas combined for cold writes), which is a small fraction of the total `createTemplate()` cost.

Template creation cost is borne by User A (the creator). Claiming cost is borne by User B. Both are reasonable for L2 deployment (< $0.10 on Optimism/Base at typical gas prices).
