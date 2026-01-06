import { NextRequest, NextResponse } from "next/server";
import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * API Route: Verify game achievement and sign badge claim
 * POST /api/verify-game-achievement
 *
 * This endpoint:
 * 1. Verifies the user actually earned the achievement (via game API)
 * 2. Signs a claim if verification passes
 *
 * Body: {
 *   user: address,
 *   badgeId: number,
 *   gameId: string (e.g., "steam", "epic", "custom"),
 *   achievementId: string,
 *   proof: any (game-specific proof like player ID, token, etc.)
 * }
 */

// EIP-712 Types for BadgeMinter
const types = {
  Claim: [
    { name: "user", type: "address" },
    { name: "badgeId", type: "uint256" },
  ],
} as const;

// Mock game achievement verification
// In production, replace with actual API calls to Steam, Epic, etc.
async function verifyGameAchievement(gameId: string, achievementId: string, proof: any): Promise<boolean> {
  // TODO: Implement actual verification
  // Examples:

  // Steam API:
  // const response = await fetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/`);

  // Epic Games:
  // const response = await fetch(`https://api.epicgames.dev/epic/achievements/v1/`);

  // Custom Game Backend:
  // const response = await fetch(`https://yourgame.com/api/verify-achievement`, {
  //   method: 'POST',
  //   body: JSON.stringify({ playerId: proof.playerId, achievementId })
  // });

  console.log(`Verifying ${gameId} achievement ${achievementId} with proof:`, proof);

  // For demo purposes, accept if proof exists
  // In production, implement real verification!
  return !!proof;
}

// Map badge IDs to required game achievements
const BADGE_REQUIREMENTS: Record<number, { gameId: string; achievementId: string; description: string }> = {
  6: {
    gameId: "steam",
    achievementId: "first_victory",
    description: "Win your first match in [Game Name]",
  },
  7: {
    gameId: "epic",
    achievementId: "legendary_item",
    description: "Obtain a legendary item in [Game Name]",
  },
  8: {
    gameId: "custom",
    achievementId: "speedrun_complete",
    description: "Complete the game in under 2 hours",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, badgeId, gameId, achievementId, proof, chainId, verifyingContract } = body;

    // Validate inputs
    if (!user || typeof user !== "string") {
      return NextResponse.json({ error: "Invalid user address" }, { status: 400 });
    }

    if (badgeId === undefined || typeof badgeId !== "number") {
      return NextResponse.json({ error: "Invalid badge ID" }, { status: 400 });
    }

    if (!gameId || !achievementId) {
      return NextResponse.json({ error: "Missing game or achievement ID" }, { status: 400 });
    }

    // Check if badge requires game achievement
    const requirement = BADGE_REQUIREMENTS[badgeId];
    if (!requirement) {
      return NextResponse.json({ error: "This badge does not require game achievement verification" }, { status: 400 });
    }

    // Verify correct game and achievement
    if (requirement.gameId !== gameId || requirement.achievementId !== achievementId) {
      return NextResponse.json({ error: "Incorrect game or achievement for this badge" }, { status: 400 });
    }

    // Verify the achievement with game API
    const isVerified = await verifyGameAchievement(gameId, achievementId, proof);
    if (!isVerified) {
      return NextResponse.json(
        { error: "Could not verify game achievement. Please check your proof." },
        { status: 403 },
      );
    }

    // Achievement verified! Sign the claim
    const signerPrivateKey = process.env.BADGE_SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      console.error("BADGE_SIGNER_PRIVATE_KEY not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const account = privateKeyToAccount(signerPrivateKey as Hex);

    const domain = {
      name: "BadgeMinter",
      version: "1",
      chainId: chainId,
      verifyingContract: verifyingContract as Hex,
    } as const;

    const message = {
      user: user as Hex,
      badgeId: BigInt(badgeId),
    } as const;

    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: "Claim",
      message,
    });

    return NextResponse.json({
      signature,
      message: {
        user,
        badgeId,
      },
      verified: true,
      achievement: {
        gameId,
        achievementId,
        description: requirement.description,
      },
      signer: account.address,
    });
  } catch (error) {
    console.error("Error verifying game achievement:", error);
    return NextResponse.json(
      { error: "Failed to verify achievement", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
