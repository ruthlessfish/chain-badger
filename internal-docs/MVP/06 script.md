## **Slide 1 — Title**
**“Hey everyone, I’m Shane, and this is my Alchemy University final project: ChainBadger - an On‑Chain Achievement Badge System. It’s a full‑stack web3 application that lets users mint verifiable achievement badges directly on an EVM chain.”**

---

## **Slide 2 — The Problem**
**“Let’s start with the problem. Right now, most achievements in web3 still live off‑chain. Whether it’s finishing a course, contributing to a project, or participating in an event, the proof usually ends up as a Discord role, a screenshot, or a centralized badge. These aren’t verifiable, they’re not portable, and users don’t truly own them.”**

---

## **Slide 3 — Why It Matters**
**“This creates a real gap. Communities can’t verify contributions, learners can’t prove their skills, and dApps can’t build reputation layers. There’s no trustless, on‑chain way to show what someone has actually accomplished.”**

---

## **Slide 4 — The Solution**
**“My solution is a decentralized on‑chain achievement badge system. It uses an ERC‑1155 smart contract to store badge types, EIP‑712 signatures to securely authorize claims, and optional soulbound logic to prevent transfers. Users can claim badges through a clean UI, and each badge is minted directly on‑chain with metadata that describes the achievement.”**

---

## **Slide 5 — How It Works**
**“Here’s the flow. The user clicks ‘Claim Badge.’ The backend signs a typed EIP‑712 message. The user submits that signature to the BadgeMinter contract. The contract verifies the signature, checks replay protection, and mints the badge through the ERC‑1155 contract. The badge then appears instantly in the user’s wallet and in the UI.”**

---

## **Slide 6 — Smart Contract Architecture**
**“The system is built using a modular, production‑style architecture.  
BadgeToken handles ERC‑1155 minting, metadata, and optional soulbound enforcement.  
BadgeMinter handles signature verification and secure claim logic.  
And an optional BadgeMetadata contract allows dynamic metadata updates without redeploying the core token contract.  
This separation keeps the system clean, secure, and easy to extend.”**

---

## **Slide 7 — Security**
**“Security was a priority. The project uses typed data signatures with EIP‑712, replay protection to prevent duplicate claims, and role‑based access control so only the Minter contract can mint badges. Soulbound mode prevents transfers, and metadata is isolated to avoid storage collisions. These are the same patterns used in real production dApps.”**

---

## **Slide 8 — Front‑End Experience**
**“The front‑end is built with Next.js, Wagmi, and Tailwind. Users can connect their wallet, browse available badges, claim them, and view the badges they already own. The UI is clean, responsive, and designed to make the on‑chain interactions feel smooth and intuitive.”**

---

## **Slide 9 — Demo**
**“Now I’ll walk through the demo.  
``First, I connect my wallet.
Next, I select a badge and click ‘Claim.’  
The app requests a signature from the backend, submits it to the contract, and waits for confirmation.  
Once the transaction completes, the badge appears in my wallet and in the UI.  
I can also open the transaction on the block explorer to verify that the badge was minted on‑chain.”**``

*(Here you perform the live demo.)*

---

## **Slide 10 — Tech Stack**
**“The project uses Solidity for the smart contracts, Hardhat for testing, Next.js for the front‑end, Wagmi and Viem for contract interaction, and TailwindCSS for styling. Everything is deployed to the Sepolia testnet.”**

---

## **Slide 11 — Future Expansion**
**“This system is designed to grow. It can support badge rarity tiers, streaks, leaderboards, DAO‑controlled badge creation, event integrations, or even a full progression system. It’s a flexible foundation for any ecosystem that values verifiable participation.”**

---

## **Slide 12 — Closing**
**“Thanks for watching. This was ChainBadger - The On‑Chain Achievement Badge System. All code, contracts, and deployment details are available in the GitHub repository. I appreciate your time, and I’m happy to answer any questions.”**

---
