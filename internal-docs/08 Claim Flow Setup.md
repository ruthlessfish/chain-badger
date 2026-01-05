# ChainBadger Claim Flow Setup Guide

## Overview
The claim flow has been successfully implemented! It uses EIP-712 typed signatures to enable gasless badge claiming with backend verification.

## Architecture

### Flow Diagram
```
User clicks "Claim Badge"
    ↓
ClaimButton requests signature from /api/sign-claim
    ↓
Backend API signs EIP-712 message with BADGE_SIGNER_PRIVATE_KEY
    ↓
Frontend submits signature to BadgeMinter.claimBadge()
    ↓
Smart contract verifies signature & mints badge
    ↓
Success! Badge appears in wallet
```

## Setup Instructions

### 1. Set up the Badge Signer

The backend needs a private key to sign claim requests. This should match the signer address used in BadgeMinter deployment.

**Option A: Use Hardhat Account #1 (Development)**
```bash
# In the hardhat package, account 1 is typically used as the signer
# Check packages/hardhat/deploy/01_deploy_badge_minter.ts to see which account is the signer
```

**Option B: Generate a New Account**
```bash
cd packages/hardhat
yarn hardhat run scripts/generateAccount.ts
# Copy the private key (without 0x prefix)
```

### 2. Configure Environment Variable

Create or update `packages/nextjs/.env.local`:

```bash
# Copy from .env.example if needed
cp packages/nextjs/.env.example packages/nextjs/.env.local

# Edit .env.local and add:
BADGE_SIGNER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

**IMPORTANT**: Never commit `.env.local` to git! It's already in `.gitignore`.

### 3. For Local Development with Hardhat

If you're using the local Hardhat node, use account #1's private key:

```typescript
// From hardhat.config.ts, the default accounts are deterministic
// Account 0 (deployer): 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
// Account 1 (signer): 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

Add to `.env.local`:
```bash
BADGE_SIGNER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

### 4. Verify Setup

After setting the environment variable:

1. Restart your Next.js dev server:
   ```bash
   cd packages/nextjs
   yarn start
   ```

2. Connect your wallet to the app

3. Try claiming a badge - you should see:
   - "Requesting signature..." notification
   - Backend signs the claim
   - "Please confirm the transaction..." notification
   - Wallet popup to confirm transaction
   - "Successfully claimed [badge name]! 🎉" notification

## Components Created

### 1. `/api/sign-claim/route.ts` (Backend API)
- **Purpose**: Sign claim requests using EIP-712
- **Method**: POST
- **Body**: `{ user, badgeId, chainId, verifyingContract }`
- **Returns**: `{ signature, message, signer }`
- **Security**: Uses `BADGE_SIGNER_PRIVATE_KEY` from environment

### 2. `ClaimButton.tsx` (Frontend Component)
- **Purpose**: Handle the full claim flow
- **Features**:
  - Checks if badge already claimed
  - Requests signature from API
  - Submits to BadgeMinter contract
  - Shows loading states (requesting → signing → minting)
  - Error handling with user-friendly messages
  - Success notifications

### 3. Updated `BadgeCard.tsx`
- Now uses `ClaimButton` component instead of simple button
- Automatically shows "✓ Claimed" for owned badges

## Testing the Claim Flow

### Prerequisites
1. Local Hardhat node running (`yarn chain`)
2. Contracts deployed (`yarn deploy`)
3. Next.js dev server running (`yarn start`)
4. `BADGE_SIGNER_PRIVATE_KEY` set in `.env.local`

### Test Steps
1. Open http://localhost:3000
2. Connect wallet (use one of the Hardhat test accounts)
3. Click "Claim Badge" on any badge
4. Watch the flow:
   - Request signature
   - Sign transaction in wallet
   - Badge minted!
5. Check "My Badges" page to see claimed badges (TODO: needs contract integration)

## Security Notes

### Current Implementation (Development)
- ✅ EIP-712 signature verification prevents tampering
- ✅ Replay protection via `hasClaimed` mapping
- ✅ Domain separator prevents cross-chain attacks
- ⚠️ No eligibility checks (anyone can request signatures)
- ⚠️ No rate limiting
- ⚠️ No audit trail

### Production Recommendations
1. **Eligibility Verification**: Add logic to verify users are eligible for specific badges
2. **Rate Limiting**: Prevent spam by limiting signature requests per IP/user
3. **Database Logging**: Store claim requests for audit trail
4. **Badge Metadata Validation**: Verify badge exists before signing
5. **Ownership Checks**: Query contract to prevent duplicate claims
6. **API Authentication**: Add authentication for signature endpoint
7. **Environment Separation**: Use different signers for dev/staging/prod

## Troubleshooting

### "Server configuration error"
- Check that `BADGE_SIGNER_PRIVATE_KEY` is set in `.env.local`
- Restart Next.js dev server after setting env vars

### "InvalidSignature" error
- Verify the signer address matches what's in the BadgeMinter contract
- Check that the chainId matches your network
- Ensure the verifying contract address is correct

### "BadgeMinter contract not deployed"
- Run `yarn deploy` in the hardhat package
- Check that you're on the correct network (hardhat/localhost)

### Transaction fails silently
- Check browser console for errors
- Verify you have enough ETH for gas (use faucet if needed)
- Ensure BadgeMinter has MINTER_ROLE on BadgeToken

## Next Steps

1. **Add Real Badge Metadata**: Replace sample badges with actual contract reads
2. **Implement Badge Modal**: Create detailed view for badges
3. **Add Owned Badges Integration**: Connect "My Badges" page to BadgeToken balances
4. **Create Admin Panel**: Allow badge creation and signer management
5. **Add Event Listeners**: Update UI when badges are claimed
6. **Implement Eligibility Logic**: Add backend checks for who can claim what

## Files Modified/Created

```
packages/nextjs/
├── app/
│   ├── api/
│   │   └── sign-claim/
│   │       └── route.ts (NEW - Backend signature API)
│   └── page.tsx (UPDATED - Simplified claim handling)
├── components/
│   └── chainbadger/
│       ├── BadgeCard.tsx (UPDATED - Uses ClaimButton)
│       ├── ClaimButton.tsx (NEW - Full claim flow)
│       └── index.ts (UPDATED - Export ClaimButton)
└── .env.example (UPDATED - Added BADGE_SIGNER_PRIVATE_KEY)
```

## EIP-712 Signature Details

The signature follows this structure:

```typescript
Domain: {
  name: "BadgeMinter",
  version: "1",
  chainId: [network chain ID],
  verifyingContract: [BadgeMinter address]
}

Types: {
  Claim: [
    { name: "user", type: "address" },
    { name: "badgeId", type: "uint256" }
  ]
}

Message: {
  user: [user's address],
  badgeId: [badge ID to claim]
}
```

This ensures signatures are:
- ✅ Network-specific (can't replay on different chains)
- ✅ Contract-specific (can't use for different contracts)
- ✅ User-specific (can't steal someone else's signature)
- ✅ Badge-specific (can't claim wrong badge with signature)
