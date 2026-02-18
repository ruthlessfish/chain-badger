# 🎉 Claim Flow Implementation - Quick Start

The badge claim flow is now fully implemented! Here's how to test it:

## ⚡ Quick Setup (5 minutes)

### 1. Set the Signer Private Key

Run this helper script to see the setup instructions:

```bash
cd packages/hardhat
yarn hardhat run scripts/displaySignerInfo.ts --network localhost
```

This will display the private key you need to add to your `.env.local` file.

### 2. Configure Environment

Create `packages/nextjs/.env.local` with:

```bash
BADGE_SIGNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 3. Restart Next.js

```bash
cd packages/nextjs
yarn start
```

### 4. Test the Flow!

1. Open http://localhost:3000
2. Connect your wallet
3. Click "Claim Badge" on any badge
4. Watch the magic happen! ✨

## 🎬 What Happens When You Claim?

```
1. User clicks "Claim Badge"
   ↓
2. Frontend → Backend API: "Sign this claim please"
   ↓
3. Backend signs with EIP-712 (cryptographic proof)
   ↓
4. Frontend → Smart Contract: "Here's the signed claim"
   ↓
5. Contract verifies signature & mints badge
   ↓
6. 🎉 Success! Badge is now yours!
```

## 🔍 What to Look For

### Notifications
- 🔵 "Requesting signature..." (backend signing)
- 🔵 "Please confirm the transaction..." (wallet popup)
- 🟢 "Successfully claimed [badge name]! 🎉" (success!)

### Console Logs
- Backend API logs in terminal
- Transaction details in browser console
- Contract events in Hardhat node logs

## 🐛 Troubleshooting

### "Server configuration error"
→ Make sure `BADGE_SIGNER_PRIVATE_KEY` is in `.env.local` and restart Next.js

### "BadgeMinter contract not deployed"
→ Run `yarn deploy` in the hardhat package

### Transaction fails
→ Check that your wallet has ETH (use the faucet button in the UI)

## 📚 Learn More

See [`internal-docs/08 Claim Flow Setup.md`](../internal-docs/08%20Claim%20Flow%20Setup.md) for:
- Detailed architecture explanation
- Security considerations
- Production recommendations
- Full troubleshooting guide

## ✅ What's Implemented

- ✅ EIP-712 signature generation (backend)
- ✅ Signature verification (smart contract)
- ✅ Replay protection (prevents double-claiming)
- ✅ User-friendly claim button with loading states
- ✅ Error handling and notifications
- ✅ Integration with BadgeMinter contract

## 🚀 Next Steps

1. ~~**Add Real Metadata**: Connect to BadgeMetadata contract~~ ✅
2. ~~**Show Owned Badges**: Query BadgeToken balances~~ ✅
3. **Add Badge Modal**: Detailed badge view before claiming
4. **Badge Template System**: User-generated badge types with eligibility rules — see `internal-docs/11 Badge Template Development Plan.md`

---

**Happy claiming! 🏆**
