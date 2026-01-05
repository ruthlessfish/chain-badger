import { NextRequest, NextResponse } from "next/server";
import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// EIP-712 Types for BadgeMinter
const types = {
  Claim: [
    { name: "user", type: "address" },
    { name: "badgeId", type: "uint256" },
  ],
} as const;

/**
 * API Route: Sign a claim request for a badge
 * POST /api/sign-claim
 * Body: { user: address, badgeId: number, chainId: number, verifyingContract: address }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, badgeId, chainId, verifyingContract } = body;

    // Validate inputs
    if (!user || typeof user !== "string") {
      return NextResponse.json({ error: "Invalid user address" }, { status: 400 });
    }

    if (badgeId === undefined || typeof badgeId !== "number") {
      return NextResponse.json({ error: "Invalid badge ID" }, { status: 400 });
    }

    if (!chainId || typeof chainId !== "number") {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 });
    }

    if (!verifyingContract || typeof verifyingContract !== "string") {
      return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
    }

    // Get signer private key from environment
    const signerPrivateKey = process.env.BADGE_SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      console.error("BADGE_SIGNER_PRIVATE_KEY not set in environment");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Create account from private key
    const account = privateKeyToAccount(signerPrivateKey as Hex);

    // EIP-712 Domain
    const domain = {
      name: "BadgeMinter",
      version: "1",
      chainId: chainId,
      verifyingContract: verifyingContract as Hex,
    } as const;

    // Message to sign
    const message = {
      user: user as Hex,
      badgeId: BigInt(badgeId),
    } as const;

    // Sign the typed data
    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: "Claim",
      message,
    });

    // TODO: In production, add additional checks:
    // 1. Check if user has already claimed this badge (query contract)
    // 2. Check if badge exists in metadata
    // 3. Rate limiting per user/IP
    // 4. Store claim requests in database for audit trail
    // 5. Verify user eligibility for specific badges

    return NextResponse.json({
      signature,
      message: {
        user,
        badgeId,
      },
      signer: account.address,
    });
  } catch (error) {
    console.error("Error signing claim:", error);
    return NextResponse.json(
      { error: "Failed to sign claim", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
