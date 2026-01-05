# ChainBadger - AI Coding Agent Instructions

## Project Vision
**ChainBadger** is an on-chain achievement badge system solving the problem that **web3 achievements still live off-chain** (Discord roles, screenshots, centralized platforms). Users can mint verifiable, ownable ERC-1155 badges proving skills, participation, or contributions in a trustless, portable way.

**Use Cases**: Educational credentials, event participation proof, community engagement rewards, gamified progression systems, cross-platform identity/reputation.

**Tech Stack**: Scaffold-ETH 2 + NextJS App Router + RainbowKit + Wagmi + Hardhat + TypeScript

## Core Architecture (3-Contract System)
1. **BadgeToken** (ERC-1155): Core NFT contract holding all badge tokens with optional soulbound mode
2. **BadgeMinter** (EIP-712): Signature-verified claiming system preventing replay attacks  
3. **BadgeMetadata**: Dynamic on-chain metadata storage (name, description, rarity, category)

**Critical Design Pattern**: Role-based access via OpenZeppelin AccessControl. BadgeMinter receives `MINTER_ROLE` from BadgeToken during deployment setup (`03_setup_roles.ts`). The owner retains `ADMIN_ROLE` for configuration.

### Smart Contract Data Flow
1. User clicks "Claim Badge" in frontend
2. Frontend requests signed message from backend (EIP-712)
3. User submits signature to `BadgeMinter.claimBadge()`
4. BadgeMinter verifies signature + checks `hasClaimed` mapping
5. BadgeMinter calls `BadgeToken.mint()` (has MINTER_ROLE)
6. Badge appears in wallet + UI emits `BadgeMinted` event

### EIP-712 Signature Flow (BadgeMinter)
Backend signs `Claim(address user, uint256 badgeId)` → Frontend submits to `claimBadge()` → Contract verifies signature + grants badge. The `hasClaimed` mapping prevents replay attacks.

**Security Features**:
- Replay protection via `mapping(address => mapping(uint256 => bool)) hasClaimed`
- Domain separator prevents cross-chain signature reuse
- Only MINTER_ROLE can mint badges
- Optional soulbound mode prevents badge transfers/trading

## Badge Metadata System

### Rarity Levels (0-4)
- **0**: Common
- **1**: Uncommon  
- **2**: Rare
- **3**: Epic
- **4**: Legendary

### BadgeInfo Struct
```solidity
struct BadgeInfo {
    string name;           // Display name
    string description;    // Achievement details
    string image;          // IPFS/HTTP URI
    string category;       // "Gaming", "DeFi", "Community", etc.
    uint256 rarity;        // 0-4 (see above)
}
```

Metadata is separate from BadgeToken to allow updates without redeploying core contracts.

## Frontend Architecture (Planned)

### Pages
- `/` - Landing page with available badges grid + claim flow
- `/my-badges` - User's owned badge inventory  
- `/admin` - Create badges, update signer (admin only)

### Key Components (To Be Built)
- `<BadgeGrid />` - Displays all available badges
- `<BadgeCard />` - Individual badge display with claim button
- `<BadgeModal />` - Detailed badge view + claim interaction
- `<ClaimButton />` - Handles full claim flow (signature request → transaction)
- `<ClaimProgress />` - Visual stepper for claim process
- `<OwnedBadgeGrid />` - User's badge collection

**Current Status**: Frontend is still the default Scaffold-ETH 2 template. See `packages/nextjs/app/page.tsx`.

## Development Workflow

### Local Development (Standard SE-2 Flow)
```bash
yarn chain          # Terminal 1: Local Hardhat node
yarn deploy         # Terminal 2: Deploy all contracts + setup roles
yarn start          # Terminal 3: NextJS frontend on :3000
```

**Key**: Deployment scripts run sequentially by number prefix (`00_`, `01_`, etc.). Scripts with `runAtTheEnd: true` execute last (`03_setup_roles.ts`, `04_deployment_summary.ts`, `05_setup_badge_metadata.ts`).

### Testing
```bash
yarn hardhat:test   # Run all contract tests with gas reporting
```

Tests use **EIP-712 typed signatures**. Example pattern from `BadgeMinter.ts`:
```typescript
const domain = {
  name: "BadgeMinter",
  version: "1",
  chainId: (await ethers.provider.getNetwork()).chainId,
  verifyingContract: await badgeMinter.getAddress(),
};
const signature = await signer.signTypedData(domain, types, message);
```


## Smart Contract Conventions

### Deployment Scripts (`packages/hardhat/deploy/`)
- **Export contract name**: `export const CONTRACT_NAME = "BadgeToken";` for TypeScript type generation
- **Dependencies**: Use `scriptName.dependencies = ["BadgeToken", "BadgeMinter"];` to enforce order
- **Setup scripts**: Mark with `runAtTheEnd: true` for post-deployment configuration

### Contract Patterns
- **Custom errors** over `require()`: `error AlreadyClaimed();` then `if (condition) revert AlreadyClaimed();`
- **Role constants**: `bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");`
- **Natspec documentation**: All public/external functions must have `@notice` and `@param` tags

### EIP-712 Signature Flow (BadgeMinter)
Backend signs `Claim(address user, uint256 badgeId)` → Frontend submits to `claimBadge()` → Contract verifies signature + grants badge. The `hasClaimed` mapping prevents replay attacks.

**Note**: Backend signer service not yet implemented. For MVP, consider using Next.js API routes (`/api/sign-claim`) with the signer private key in env vars.

## Frontend Integration (Scaffold-ETH 2 Hooks)

### Contract Interactions - ALWAYS Use These Hooks
**Reading**:
```typescript
const { data } = useScaffoldReadContract({
  contractName: "BadgeToken",
  functionName: "balanceOf",
  args: [address, badgeId],
});
```

**Writing**:
```typescript
const { writeContractAsync } = useScaffoldWriteContract({ contractName: "BadgeMinter" });
await writeContractAsync({
  functionName: "claimBadge",
  args: [badgeId, signature],
});
```

**Events**:
```typescript
const { data: events } = useScaffoldEventHistory({
  contractName: "BadgeToken",
  eventName: "BadgeMinted",
  watch: true,
});
```

### Component Library (@scaffold-ui/components)
- **Address display**: `<Address address={userAddress} />`
- **Address input**: `<AddressInput value={addr} onChange={setAddr} />`
- **Balance**: `<Balance address={addr} />`

**Never** use raw `wagmi` hooks directly - always use the Scaffold-ETH wrappers for type safety.

## Configuration Files

### `scaffold.config.ts` (Frontend Network)
```typescript
targetNetworks: [chains.hardhat]  // Local dev
targetNetworks: [chains.sepolia]  // Testnet
```

### `hardhat.config.ts` (Deployment Network)
- Default: `localhost` (local node)
- Set `defaultNetwork` or use `--network sepolia` flag for live deployments
- Solidity version: **0.8.24** with Cancun EVM and 200 optimizer runs

## Account Abstraction (AA) Support
Utility exists for smart contract wallet deployment via `deployWithAA()` using Alchemy Account Kit:
- Uses CREATE2 deployer (`0x4e59b44847b379578588920ca78fbf26c0b4956c`)
- Requires AA-SDK dependencies (`@aa-sdk/core`, `@account-kit/infra`)
- Not currently used in default deployment flow

## Critical Gotchas
1. **Contract hot reload**: Frontend auto-updates when you redeploy locally (reads `deployedContracts.ts`)
2. **Type generation**: After deployment, run `yarn hardhat:compile` to regenerate TypeScript types in `typechain-types/`
3. **Deployment order**: Role setup MUST happen after both BadgeToken and BadgeMinter deploy
4. **Soulbound mode**: When enabled, blocks ALL transfers including secondary sales
5. **Metadata updates**: BadgeMetadata is separate from BadgeToken to allow updating badge info post-deployment

## Project Roadmap & Status

### ✅ Completed (MVP Contracts)
- ERC-1155 BadgeToken with soulbound logic
- BadgeMinter with EIP-712 signature verification  
- BadgeMetadata with dynamic on-chain storage
- Deployment scripts with role setup
- Comprehensive test suite with gas reporting
- Scaffold-ETH 2 integration

### 🚧 In Progress (Frontend Development)
- Custom badge UI components
- Claim flow with signature requests
- User badge inventory page
- Admin panel for badge creation

### 🎯 Planned Features
- Backend API for signature generation
- Badge rarity tiers and categories
- Leaderboard/achievements page
- Factory contract for permissionless badge creation
- Cross-chain badge support

## File Locations
- Smart contracts: `packages/hardhat/contracts/`
- Deploy scripts: `packages/hardhat/deploy/`
- Tests: `packages/hardhat/test/`
- Frontend pages: `packages/nextjs/app/`
- SE-2 hooks: `packages/nextjs/hooks/scaffold-eth/`
- Contract ABIs (auto-generated): `packages/nextjs/contracts/deployedContracts.ts`
- Internal docs: `internal-docs/` (design specs, wireframes, project planning)

## Additional Context
- See `.cursor/rules/scaffold-eth.mdc` for detailed Scaffold-ETH 2 patterns
- See `internal-docs/` for original project vision and UI wireframes (pre-Scaffold-ETH migration)
- Project is an Alchemy University final project demonstrating on-chain credential systems
