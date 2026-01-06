# � ChainBadger

**On-Chain Achievement Badges for Web3**

ChainBadger is a decentralized achievement badge system that brings verifiable, ownable credentials to web3. Users can mint ERC-1155 badges that prove their skills, participation, and contributions—all stored on-chain and truly portable across platforms.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Scaffold-ETH 2](https://img.shields.io/badge/Built%20with-Scaffold--ETH%202-orange)](https://scaffoldeth.io)

## 🎯 **Problem & Solution**

**The Problem**: Web3 achievements currently live off-chain in Discord roles, screenshots, or centralized platforms. These credentials aren't verifiable, portable, or truly owned by users.

**The Solution**: ChainBadger creates trustless, on-chain badges that users actually own. Achievements become NFTs that can be verified cryptographically and carried across any platform that supports the standard.

## ✨ **Key Features**

- 🔒 **Trustless & Verifiable**: All badges stored on-chain with cryptographic proof of authenticity
- 🎯 **Truly Ownable**: ERC-1155 badges that users control in their wallets
- ⚡ **Gasless Claiming**: EIP-712 signature verification for affordable claims
- 🎨 **Dynamic Metadata**: Update badge information without redeploying contracts
- 🔐 **Soulbound Option**: Prevent badge transfers for identity-based use cases
- 🎮 **Game Integration Ready**: Verify achievements from Steam, Epic Games, and custom games
- 🛡️ **Replay Protection**: Cryptographic safeguards prevent double-claiming and fraud

## 🏗️ **Architecture**

ChainBadger uses a 3-contract system powered by OpenZeppelin:

1. **BadgeToken** (ERC-1155)
   - Core NFT contract holding all badge tokens
   - Role-based access control (MINTER_ROLE, ADMIN_ROLE)
   - Optional soulbound mode for non-transferable badges

2. **BadgeMinter** (EIP-712 Signatures)
   - Signature-verified claiming system
   - Prevents replay attacks with `hasClaimed` mapping
   - Backend-signed claims for eligibility verification

3. **BadgeMetadata**
   - Dynamic on-chain metadata storage
   - Badge rarity system (Common → Legendary)
   - Category-based organization

### **Badge Claim Flow**

```
User clicks "Claim Badge"
    ↓
Frontend requests signed message from backend API
    ↓
Backend verifies eligibility & signs EIP-712 message
    ↓
User submits signature to BadgeMinter.claimBadge()
    ↓
Contract verifies signature + checks hasClaimed mapping
    ↓
BadgeMinter mints badge via BadgeToken (MINTER_ROLE)
    ↓
Badge appears in wallet + UI updates
```

## 🚀 **Quick Start**

### **Prerequisites**

- [Node.js (>= v20.18.3)](https://nodejs.org/en/download/)
- [Yarn (v1 or v2+)](https://classic.yarnpkg.com/en/docs/install/)
- [Git](https://git-scm.com/downloads)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/ruthlessfish/chain-badger.git
cd chain-badger

# Install dependencies
yarn install
```

### **Development Setup**

**Terminal 1 - Start local blockchain:**
```bash
yarn chain
```

**Terminal 2 - Deploy contracts:**
```bash
cd packages/hardhat
yarn deploy
```

This deploys all 3 contracts and sets up 5 sample badges with metadata.

**Terminal 3 - Configure backend signer:**
```bash
# Display signer info and setup instructions
yarn hardhat run scripts/displaySignerInfo.ts --network localhost

# Copy the private key to .env.local
cd ../nextjs
cp .env.example .env.local
# Edit .env.local and add:
# BADGE_SIGNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Terminal 3 - Start frontend:**
```bash
yarn start
```

Visit http://localhost:3000 and start claiming badges! 🎉

### **Testing**

```bash
# Run smart contract tests
cd packages/hardhat
yarn hardhat:test

# All tests include gas reporting and EIP-712 signature verification
```

## 📚 **Project Structure**

```
chain-badger/
├── packages/
│   ├── hardhat/                  # Smart contracts & deployment
│   │   ├── contracts/
│   │   │   ├── BadgeToken.sol    # ERC-1155 badge NFT
│   │   │   ├── BadgeMinter.sol   # EIP-712 claim verification
│   │   │   └── BadgeMetadata.sol # Dynamic metadata storage
│   │   ├── deploy/               # Deployment scripts (00-05)
│   │   ├── test/                 # Comprehensive test suite
│   │   └── scripts/              # Helper scripts
│   │
│   └── nextjs/                   # Frontend application
│       ├── app/
│       │   ├── page.tsx          # Landing page with badge grid
│       │   ├── my-badges/        # User's badge collection
│       │   └── api/
│       │       ├── sign-claim/   # Backend claim signing
│       │       └── verify-game-achievement/  # Game integration
│       ├── components/
│       │   └── chainbadger/      # Badge UI components
│       │       ├── BadgeCard.tsx
│       │       ├── BadgeGrid.tsx
│       │       ├── ClaimButton.tsx
│       │       └── OwnedBadgeGrid.tsx
│       └── hooks/
│           └── chainbadger/
│               └── useBadges.ts  # Contract data fetching
│
└── internal-docs/                # Detailed documentation
    ├── 04 Smart Contract Architecture Overview.md
    ├── 08 Claim Flow Setup.md
    └── 09 Game Achievement Integration.md
```

## 🎮 **Use Cases**

- **Educational Credentials**: Proof of course completion, bootcamp participation
- **Gaming Achievements**: Verify accomplishments from Steam, Epic Games, custom games
- **Event Participation**: Proof of attendance at conferences, hackathons, meetups
- **Community Engagement**: Reward active community members with verifiable status
- **DAO Contributions**: Recognize governance participation and project contributions
- **Cross-Platform Identity**: Portable reputation system across multiple platforms

## 🔧 **Key Technologies**

- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, DaisyUI
- **Smart Contracts**: Solidity 0.8.24, OpenZeppelin (ERC-1155, AccessControl)
- **Web3 Stack**: Scaffold-ETH 2, RainbowKit, Wagmi, Viem
- **Development**: Hardhat, Chai, TypeScript
- **Signature Standard**: EIP-712 (typed structured data)

## 🎨 **Badge Rarity System**

| Rarity | Level | Color | Use Case |
|--------|-------|-------|----------|
| 0 | Common | Gray | Basic participation |
| 1 | Uncommon | Green | Regular engagement |
| 2 | Rare | Blue | Notable achievements |
| 3 | Epic | Purple | Major accomplishments |
| 4 | Legendary | Gold | Exceptional feats |

## 🔐 **Security Features**

- ✅ **EIP-712 Signatures**: Tamper-proof typed data signatures
- ✅ **Replay Protection**: `hasClaimed` mapping prevents double-claims
- ✅ **Domain Separation**: Prevents cross-chain signature reuse
- ✅ **Role-Based Access**: OpenZeppelin AccessControl for permission management
- ✅ **Custom Errors**: Gas-efficient error handling
- ✅ **Comprehensive Tests**: 100% coverage of core functionality

## 🛠️ **Development Guide**

### **Creating New Badges**

1. **Via Deployment Script** (`packages/hardhat/deploy/05_setup_badge_metadata.ts`):
```typescript
const BADGES = [
  {
    id: 6,
    name: "New Achievement",
    description: "Earned by doing something awesome",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=new-achievement",
    category: "Custom",
    rarity: 2, // Rare
  }
];
```

2. **Via Contract Call** (after deployment):
```typescript
await badgeMetadata.setBadgeData(
  badgeId,
  "Name",
  "Description",
  "imageURL",
  "Category",
  rarity
);
```

### **Integrating Game Achievements**

ChainBadger includes built-in support for verifying achievements from:
- Steam (via Steam Web API)
- Epic Games (via Epic Games Services)
- Custom game backends

See `internal-docs/09 Game Achievement Integration.md` for full implementation guide.

### **Customizing Badge Images**

**Option 1**: Use placeholder services (DiceBear, UI Avatars)
**Option 2**: Host locally in `packages/nextjs/public/badges/`
**Option 3**: Upload to IPFS (production recommended)

See deployment script for examples.

## 📖 **Documentation**

- **Smart Contract Architecture**: `internal-docs/04 Smart Contract Architecture Overview.md`
- **Claim Flow Setup**: `internal-docs/08 Claim Flow Setup.md`
- **Game Integration**: `internal-docs/09 Game Achievement Integration.md`
- **Quick Start Guide**: `CLAIM_FLOW_README.md`

## 🧪 **Testing**

Run the comprehensive test suite:

```bash
cd packages/hardhat
yarn hardhat:test
```

**Test Coverage:**
- ✅ BadgeToken: ERC-1155 compliance, soulbound mode, access control
- ✅ BadgeMinter: EIP-712 signatures, replay protection, claim validation
- ✅ BadgeMetadata: Metadata CRUD, batch operations, URI generation

## 🚀 **Deployment**

### **Local (Hardhat)**
```bash
yarn deploy
```

### **Testnet (Sepolia)**
```bash
yarn deploy --network sepolia
```

### **Mainnet**
```bash
yarn deploy --network mainnet
# ⚠️ Ensure proper security audit before mainnet deployment
```

## 🤝 **Contributing**

See [CONTRIBUTING.md] for detailed contribution guidelines and workflow.

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- Built with [Scaffold-ETH 2](https://scaffoldeth.io)
- Alchemy University Final Project
- OpenZeppelin for battle-tested smart contract libraries

## 🔗 **Links**

- **Documentation**: See `internal-docs/` directory
- **Scaffold-ETH 2**: https://scaffoldeth.io
- **OpenZeppelin**: https://openzeppelin.com

---

**Made with ❤️ for the web3 community**