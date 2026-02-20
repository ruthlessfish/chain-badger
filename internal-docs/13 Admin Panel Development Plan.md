# 🛡️ Admin Panel — Development Plan

> **Goal**: Build a protected `/admin` page that gives the contract owner and template creators a central hub to manage the badge ecosystem — update the signer, manage templates, and monitor system health — without needing the Hardhat debug panel.

---

## Table of Contents

1. [Scope & Goals](#1-scope--goals)
2. [Access Control Model](#2-access-control-model)
3. [Page Architecture](#3-page-architecture)
4. [Feature Breakdown](#4-feature-breakdown)
5. [Component Plan](#5-component-plan)
6. [Hooks Plan](#6-hooks-plan)
7. [Phase Sequence](#7-phase-sequence)
8. [File Inventory](#8-file-inventory)
9. [Decisions & Open Questions](#9-decisions--open-questions)

---

## 1. Scope & Goals

### In Scope (MVP Admin Panel)
- **Owner panel**: Update the authorized signer address on `BadgeMinter`
- **Owner panel**: Set/update the `BadgeTemplate` contract reference on `BadgeMinter`
- **Owner panel**: Set the `authorizedMinter` on `BadgeTemplate`
- **Template management**: Creator-accessible panel to deactivate, reactivate, archive, and edit requirements/metadata for templates they own
- **System status**: At-a-glance dashboard showing contract addresses, signer address, and claim counts

### Out of Scope (for now)
- Role-based access control (RBAC) — the contracts use `Ownable`, not `AccessControl`
- Multi-sig / timelocked admin actions
- Bulk template operations
- On-chain pause (`Pausable`) — not yet implemented in contracts

---

## 2. Access Control Model

There are **two tiers** of admin in the current contract architecture:

| Tier | Who | What they can do |
|------|-----|-----------------|
| **Contract Owner** | Deployer wallet (`Ownable`) | Update signer, set contract references |
| **Template Creator** | Any wallet that created a template | Deactivate/reactivate/archive their own templates, update requirements + metadataURI |

### Frontend Enforcement Strategy

- **Contract owner features**: Gated by comparing `connectedAddress` to `owner()` from both `BadgeMinter` and `BadgeTemplate`. Read via `useScaffoldReadContract`.
- **Template creator features**: Gated by comparing `connectedAddress` to `template.creator` for each template. Already derivable from `BadgeTemplate.getTemplatesByCreator(address)`.
- **UI-level gates only**: Smart contracts enforce on-chain; frontend gates are UX polish, not security.

```
/admin
 ├── [All connected wallets see]  → System Status panel (read-only)
 ├── [Owner wallet only]          → Owner Controls panel
 └── [Any wallet]                 → My Templates panel (filtered by creator address)
```

---

## 3. Page Architecture

### Route
```
/admin                   → Main admin dashboard (tabbed layout)
```

No sub-routes needed for MVP. Tabs handle the three sections within a single page.

### Layout

```
 ─────────────────────────────────────────────────────────────
  🛡️  Admin Panel
  ──────────────────────────────────────────────────────────
  [ System Status ] [ Owner Controls ] [ My Templates ]
 ─────────────────────────────────────────────────────────────

  Tab: System Status (default, visible to all)
  ┌─────────────────────────────────────────────────────────┐
  │  Contract Addresses                                      │
  │  BadgeMinter:    0xabc...  [ copy ]                     │
  │  BadgeTemplate:  0xdef...  [ copy ]                     │
  │  BadgeToken:     0x123...  [ copy ]                     │
  │                                                          │
  │  Active Signer:  0x456...  [ copy ]                     │
  │  Total Templates: 12   |   Total Claims: 87             │
  └─────────────────────────────────────────────────────────┘

  Tab: Owner Controls  (owner wallet only)
  ┌─────────────────────────────────────────────────────────┐
  │  Update Signer                                           │
  │  Current: 0x456...                                      │
  │  New signer address: [ _________________ ] [ Update ]   │
  │                                                          │
  │  Set BadgeTemplate Contract                             │
  │  Current: 0xdef...                                      │
  │  New address: [ _________________ ] [ Set ]             │
  │                                                          │
  │  Set Authorized Minter (on BadgeTemplate)               │
  │  Current: 0xabc...                                      │
  │  New address: [ _________________ ] [ Set ]             │
  └─────────────────────────────────────────────────────────┘

  Tab: My Templates  (filtered by connected address)
  ┌─────────────────────────────────────────────────────────┐
  │  Template #3  "Solidity Wizard"     🟢 Active            │
  │  Claims: 12 / 50   [ Deactivate ] [ Archive ]           │
  │  [ Edit Metadata URI ] [ Update Requirements ]           │
  │                                                          │
  │  Template #7  "Event Attendee"      🔴 Inactive          │
  │  Claims: 23 / 100  [ Reactivate ] [ Archive ]           │
  └─────────────────────────────────────────────────────────┘
```

---

## 4. Feature Breakdown

### 4.1 System Status (Read-Only Dashboard)

**Purpose**: Let anyone with a connected wallet quickly see the current system state.

| Data Point | Source | Hook |
|---|---|---|
| BadgeMinter address | `deployedContracts.ts` | Static import |
| BadgeTemplate address | `deployedContracts.ts` | Static import |
| BadgeToken address | `deployedContracts.ts` | Static import |
| Current signer | `BadgeMinter.signer()` | `useScaffoldReadContract` |
| Total templates | `BadgeTemplate.nextTemplateId` | `useScaffoldReadContract` |
| Total claims (all templates) | `TemplateBadgeClaimed` event history on `BadgeMinter` | `useScaffoldEventHistory` (count events) |
| BadgeMinter owner | `BadgeMinter.owner()` | `useScaffoldReadContract` |
| BadgeTemplate owner | `BadgeTemplate.owner()` | `useScaffoldReadContract` |

**Note**: Total claims uses `useScaffoldEventHistory` on the `TemplateBadgeClaimed` event from `BadgeMinter`. Counting events is more scalable than summing `templateClaimCount` for every template ID, and works naturally with the `watch: true` option for live updates.

---

### 4.2 Owner Controls

**Protected**: Only visible/interactive when `connectedAddress === owner`.

#### 4.2.1 Update Signer (`BadgeMinter.setSigner`)
- Input: Address field (validated as checksummed ETH address)
- Shows: current signer, transaction status
- Contract call: `BadgeMinter.setSigner(newSigner)`
- Post-success: re-fetches signer from contract

#### 4.2.2 Set BadgeTemplate Reference (`BadgeMinter.setBadgeTemplate`)
- Input: Address field
- Shows: current `badgeTemplate` address from contract
- Contract call: `BadgeMinter.setBadgeTemplate(address)`
- Useful after redeploying BadgeTemplate

#### 4.2.3 Set Authorized Minter (`BadgeTemplate.setAuthorizedMinter`)
- Input: Address field
- Shows: current `authorizedMinter` address from `BadgeTemplate`
- Contract call: `BadgeTemplate.setAuthorizedMinter(address)`
- Useful after redeploying BadgeMinter

---

### 4.3 My Templates Panel

**Visible to all** connected wallets; content filtered to `getTemplatesByCreator(connectedAddress)`.

Shows a list of the user's templates. Each template card exposes:

#### Per-template actions:

| Action | Contract fn | When visible |
|---|---|---|
| Deactivate | `BadgeTemplate.deactivateTemplate(id)` | Active, not archived |
| Reactivate | `BadgeTemplate.reactivateTemplate(id)` | Inactive, not archived |
| Archive | `BadgeTemplate.archiveTemplate(id)` | Not archived (irreversible — confirm dialog required) |
| Edit Metadata URI | `BadgeTemplate.updateMetadataURI(id, uri)` | Not archived |
| Update Requirements | `BadgeTemplate.updateRequirements(id, bytes)` | Not archived |

**Archive action**: Must show a confirmation modal with a warning that this action is **permanent and irreversible**. Do not allow a single-click archive.

**Update Requirements**: Encodes a `Requirements` struct to ABI bytes. The UI should match the `RequirementsBuilder` component already used in `CreateTemplateForm` — reuse it here.

---

## 5. Component Plan

### New files to create

```
packages/nextjs/app/admin/
  page.tsx                         ← Admin page shell with tab layout

packages/nextjs/components/chainbadger/admin/
  index.ts                         ← Barrel export
  AdminTabs.tsx                    ← Tab navigation (System Status / Owner Controls / My Templates)
  SystemStatus.tsx                 ← Read-only contract info dashboard
  OwnerControls.tsx                ← Owner-only write actions (signer + contract refs)
  UpdateSignerForm.tsx             ← Form to call BadgeMinter.setSigner()
  SetContractRefForm.tsx           ← Reusable form for setting a contract address (used twice)
  MyTemplatesPanel.tsx             ← Fetches + lists creator's templates
  TemplateAdminCard.tsx            ← Single template row with action buttons
  ArchiveConfirmModal.tsx          ← Confirmation dialog for irreversible archive action
  EditMetadataForm.tsx             ← Inline form to update metadataURI
  EditRequirementsForm.tsx         ← Reuses RequirementsBuilder to update requirements bytes
```

### Reused existing components

| Component | Used in |
|---|---|
| `RequirementsBuilder` | `EditRequirementsForm` |
| `TemplateStatusBadge` | `TemplateAdminCard` |
| `SupplyIndicator` | `TemplateAdminCard` |
| SE-2 `<Address />` | `SystemStatus` |
| SE-2 `<AddressInput />` | `UpdateSignerForm`, `SetContractRefForm` |

---

## 6. Hooks Plan

### New hooks to create

```
packages/nextjs/hooks/chainbadger/
  useAdminStatus.ts        ← Reads owner addresses from both contracts + signer
  useMyTemplates.ts        ← Calls getTemplatesByCreator(address) + enriches with template data
  useTemplateAdminActions.ts ← Write hooks for deactivate/reactivate/archive/updateURI/updateRequirements
  useOwnerActions.ts       ← Write hooks for setSigner, setBadgeTemplate, setAuthorizedMinter
```

#### `useAdminStatus`
```typescript
// Returns:
{
  minterOwner: Address,
  templateOwner: Address,
  signer: Address,
  badgeTemplateRef: Address,
  authorizedMinter: Address,
  isOwner: boolean,          // connectedAddress === minterOwner
  isLoading: boolean,
}
```

#### `useMyTemplates`
```typescript
// Calls BadgeTemplate.getTemplatesByCreator(connectedAddress)
// Then fetches full BadgeTemplateData for each ID
// Returns enriched template objects + loading state
```

#### `useTemplateAdminActions`
```typescript
// Returns write functions:
{
  deactivate: (templateId) => Promise<void>,
  reactivate: (templateId) => Promise<void>,
  archive:    (templateId) => Promise<void>,
  updateMetadataURI: (templateId, uri) => Promise<void>,
  updateRequirements: (templateId, requirements: RequirementConfig) => Promise<void>,
}
// Each wraps useScaffoldWriteContract({ contractName: "BadgeTemplate" })
```

#### `useOwnerActions`
```typescript
// Returns write functions:
{
  setSigner:             (address) => Promise<void>,  // BadgeMinter
  setBadgeTemplate:      (address) => Promise<void>,  // BadgeMinter
  setAuthorizedMinter:   (address) => Promise<void>,  // BadgeTemplate
}
```

---

## 7. Phase Sequence

### Phase 1 — Page Shell + System Status *(lowest risk, no writes)*

1. Create `packages/nextjs/app/admin/page.tsx` with tab structure
2. Create `AdminTabs.tsx` component
3. Create `useAdminStatus.ts` hook (reads only)
4. Create `SystemStatus.tsx` — display contract addresses and signer
5. Add `/admin` link to `Header.tsx` nav

**Done when**: `/admin` loads, shows contract addresses, signer address, and template count. No wallet needed for read data.

---

### Phase 2 — My Templates Panel *(creator writes)*

1. Create `useMyTemplates.ts` hook
2. Create `useTemplateAdminActions.ts` hook
3. Create `MyTemplatesPanel.tsx`
4. Create `TemplateAdminCard.tsx` (status badge, supply indicator, action buttons)
5. Create `ArchiveConfirmModal.tsx`
6. Create `EditMetadataForm.tsx` (inline expand/collapse)
7. Create `EditRequirementsForm.tsx` (reuses `RequirementsBuilder`)

**Done when**: Connected wallets can see their templates, toggle active/inactive, archive with confirmation, and update metadata URI.

---

### Phase 3 — Owner Controls *(owner-only writes)*

1. Create `useOwnerActions.ts` hook
2. Create `OwnerControls.tsx` (shown only when `isOwner === true`)
3. Create `UpdateSignerForm.tsx`
4. Create `SetContractRefForm.tsx` (reused for both `setBadgeTemplate` and `setAuthorizedMinter`)

**Done when**: Owner wallet can update the signer and contract references from the UI. Non-owner wallets see a "Not authorized" message or the tab is hidden.

---

## 8. File Inventory

### New files

| File | Purpose |
|---|---|
| `app/admin/page.tsx` | Admin page |
| `components/chainbadger/admin/index.ts` | Barrel export |
| `components/chainbadger/admin/AdminTabs.tsx` | Tab navigation |
| `components/chainbadger/admin/SystemStatus.tsx` | Read-only dashboard |
| `components/chainbadger/admin/OwnerControls.tsx` | Owner-gated write panel |
| `components/chainbadger/admin/UpdateSignerForm.tsx` | Update signer form |
| `components/chainbadger/admin/SetContractRefForm.tsx` | Reusable contract ref setter |
| `components/chainbadger/admin/MyTemplatesPanel.tsx` | Creator template list |
| `components/chainbadger/admin/TemplateAdminCard.tsx` | Per-template management row |
| `components/chainbadger/admin/ArchiveConfirmModal.tsx` | Irreversible action guard |
| `components/chainbadger/admin/EditMetadataForm.tsx` | Inline metadata URI edit |
| `components/chainbadger/admin/EditRequirementsForm.tsx` | Requirements update (reuses builder; decodes current bytes back to `RequirementConfig`) |
| `hooks/chainbadger/useAdminStatus.ts` | Reads owner/signer state |
| `hooks/chainbadger/useMyTemplates.ts` | Creator's template list |
| `hooks/chainbadger/useTemplateAdminActions.ts` | Template write actions |
| `hooks/chainbadger/useOwnerActions.ts` | Owner write actions |
| `utils/decodeRequirements.ts` | ABI-decodes `bytes` from `BadgeTemplate` back into `RequirementConfig` shape (needed by `EditRequirementsForm`) |

### Modified files

| File | Change |
|---|---|
| `components/Header.tsx` | Add `/admin` nav link, shown only when connected wallet matches `BadgeMinter.owner()` |
| `components/chainbadger/index.ts` | Export admin components (if barrel includes admin) |

---

## 9. Decisions & Open Questions

### Decided

| Decision | Rationale |
|---|---|
| Single `/admin` page with tabs (not sub-routes) | Simpler navigation; all admin actions fit on one page at MVP scale |
| Creator templates panel visible to all wallets | Creators aren't "admins" — any wallet may have templates to manage |
| Owner controls hidden (not just disabled) for non-owners | Reduces confusion; non-owners have nothing to do there |
| Archive requires confirmation modal | Contract archives are permanent and irreversible |
| Reuse `RequirementsBuilder` in edit form | Consistency with create flow; avoids duplicating complex UI logic |
| Read-only System Status visible without wallet connection | Useful for debugging/monitoring without requiring a connected wallet |
| `/admin` nav link shown only to owner wallet | Keeps the nav clean; non-owners have no owner-level actions — reading `owner()` in Header is acceptable overhead |
| Total claims via event-based aggregate (`TemplateBadgeClaimed`) | More scalable than frontend sum; use `useScaffoldEventHistory` on `BadgeMinter` and count events |
| `EditRequirementsForm` shows decoded current requirements | Much better UX; requires an ABI-decode utility to reverse the `bytes` back into `RequirementConfig` — build alongside the form |
| `UpdateSignerForm` — no private key validation | Contract doesn't enforce it; a UI warning ("ensure you control this address") is sufficient |
