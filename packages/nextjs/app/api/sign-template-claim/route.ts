/**
 * POST /api/sign-template-claim
 *
 * Issues a short-lived EIP-712 TemplateClaim signature for a user who has met
 * the requirements of a badge template.
 *
 * Flow:
 *   1. Validate request body
 *   2. Load template from BadgeTemplate contract
 *   3. Validate template is claimable (active, not archived, under supply cap)
 *   4. Decode requirements bytes → Requirements struct
 *   5. Evaluate each requirement against the user (token balance, XP, etc.)
 *   6. If all pass → build EIP-712 TemplateClaim struct with deadline
 *   7. Sign with BADGE_SIGNER_PRIVATE_KEY and return { signature, deadline, badgeId, ... }
 *
 * Error responses:
 *   400 — Missing / invalid fields
 *   403 — One or more requirements not met
 *   404 — Template not found, inactive, or archived
 *   409 — Supply cap reached
 *   500 — Signing error or RPC failure
 */
import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, formatUnits, getAddress, http, isAddress, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { EligibilityCheck } from "~~/types/badge";
import { getContractConfig, getPublicClient, getRpcUrl, getTargetChain } from "~~/utils/contractConfig";
import { decodeRequirements } from "~~/utils/requirementsDecoder";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Signature TTL in seconds. Override via SIGNATURE_TTL_SECONDS env var. */
const SIGNATURE_TTL_SECONDS = parseInt(process.env.SIGNATURE_TTL_SECONDS ?? "600", 10);

// EIP-712 type definition for TemplateClaim (must match BadgeMinter.sol)
const TEMPLATE_CLAIM_TYPES = {
  TemplateClaim: [
    { name: "user", type: "address" },
    { name: "templateId", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ── 1. Parse & validate body ────────────────────────────────────────────

  let body: { user?: string; templateId?: number; chainId?: number; verifyingContract?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user, templateId } = body;

  if (!user || !isAddress(user)) {
    return NextResponse.json({ error: "Missing or invalid `user` address" }, { status: 400 });
  }
  if (templateId === undefined || templateId === null || isNaN(Number(templateId))) {
    return NextResponse.json({ error: "Missing or invalid `templateId`" }, { status: 400 });
  }

  const userAddress = getAddress(user);
  const templateIdBigInt = BigInt(templateId);

  // ── 2. Load contract configs ────────────────────────────────────────────

  let badgeTemplateConfig: Awaited<ReturnType<typeof getContractConfig>>;
  let badgeMinterConfig: Awaited<ReturnType<typeof getContractConfig>>;

  try {
    [badgeTemplateConfig, badgeMinterConfig] = await Promise.all([
      getContractConfig("BadgeTemplate"),
      getContractConfig("BadgeMinter"),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: "Contracts not deployed. Run `yarn deploy` first.", detail: String(err) },
      { status: 500 },
    );
  }

  const publicClient = getPublicClient();

  // ── 3. Load template from chain ─────────────────────────────────────────

  let templateExists: boolean;
  try {
    templateExists = (await publicClient.readContract({
      address: badgeTemplateConfig.address,
      abi: badgeTemplateConfig.abi as never[],
      functionName: "templateExists",
      args: [templateIdBigInt],
    })) as boolean;
  } catch (err) {
    return NextResponse.json({ error: "Failed to read template", detail: String(err) }, { status: 500 });
  }

  if (!templateExists) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let template: {
    creator: string;
    badgeId: bigint;
    metadataURI: string;
    requirements: `0x${string}`;
    requirementsHash: `0x${string}`;
    templateVersion: number;
    maxClaims: bigint;
    active: boolean;
    archived: boolean;
    createdAt: bigint;
  };

  let claimCount: bigint;

  try {
    [template, claimCount] = await Promise.all([
      publicClient.readContract({
        address: badgeTemplateConfig.address,
        abi: badgeTemplateConfig.abi as never[],
        functionName: "getTemplate",
        args: [templateIdBigInt],
      }) as Promise<typeof template>,
      publicClient.readContract({
        address: badgeTemplateConfig.address,
        abi: badgeTemplateConfig.abi as never[],
        functionName: "templateClaimCount",
        args: [templateIdBigInt],
      }) as Promise<bigint>,
    ]);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch template data", detail: String(err) }, { status: 500 });
  }

  // ── 4. Lifecycle checks ─────────────────────────────────────────────────

  if (template.archived) {
    return NextResponse.json({ error: "Template is archived" }, { status: 404 });
  }

  if (!template.active) {
    return NextResponse.json({ error: "Template is not active" }, { status: 404 });
  }

  if (template.maxClaims > 0n && claimCount >= template.maxClaims) {
    return NextResponse.json({ error: "Supply cap reached for this template" }, { status: 409 });
  }

  // ── 5. Decode & evaluate requirements ───────────────────────────────────

  const requirements = decodeRequirements(template.requirements, template.templateVersion);
  const eligibilityChecks: EligibilityCheck[] = [];
  let allPassed = true;

  // — Token gate —
  if (requirements.token !== zeroAddress && requirements.minBalance > 0n) {
    let balance = 0n;
    let tokenSymbol = "TOKEN";

    try {
      // Minimal ERC-20 ABI for balanceOf + symbol
      const erc20Abi = [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ type: "uint256" }],
        },
        { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
        { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
      ] as const;

      const [rawBalance, symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: requirements.token as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [userAddress],
        }),
        publicClient
          .readContract({ address: requirements.token as `0x${string}`, abi: erc20Abi, functionName: "symbol" })
          .catch(() => "TOKEN"),
        publicClient
          .readContract({ address: requirements.token as `0x${string}`, abi: erc20Abi, functionName: "decimals" })
          .catch(() => 18),
      ]);

      balance = rawBalance as bigint;
      tokenSymbol = symbol as string;
      const dec = decimals as number;
      const passed = balance >= requirements.minBalance;
      if (!passed) allPassed = false;

      eligibilityChecks.push({
        requirement: `Hold at least ${formatUnits(requirements.minBalance, dec)} ${tokenSymbol}`,
        passed,
        current: `${formatUnits(balance, dec)} ${tokenSymbol}`,
        required: `${formatUnits(requirements.minBalance, dec)} ${tokenSymbol}`,
      });
    } catch (err) {
      // RPC error reading token — treat as failed so we don't grant unearned badges
      allPassed = false;
      eligibilityChecks.push({
        requirement: `Hold required token balance`,
        passed: false,
        current: "Unable to check balance",
        required: String(requirements.minBalance),
      });
      console.error("[sign-template-claim] Error reading token balance:", err);
    }
  }

  // — XP gate — (placeholder: always passes for MVP)
  if (requirements.minXP > 0n) {
    // TODO: integrate with an on-chain XP counter or external API
    // For MVP we log a warning and pass — replace with real check
    console.warn(
      `[sign-template-claim] XP requirement (${requirements.minXP}) not enforced in MVP — implement XP source`,
    );
    eligibilityChecks.push({
      requirement: `Minimum ${requirements.minXP.toString()} XP`,
      passed: true,
      current: "XP check not enforced in MVP",
      required: requirements.minXP.toString(),
    });
  }

  // — Social follow gate — (placeholder: always passes for MVP)
  if (requirements.mustFollowCreator) {
    // TODO: integrate with a social API (Farcaster, Lens, etc.)
    console.warn("[sign-template-claim] mustFollowCreator not enforced in MVP — implement social API");
    eligibilityChecks.push({
      requirement: "Follow the badge creator",
      passed: true,
      current: "Social check not enforced in MVP",
    });
  }

  if (!allPassed) {
    return NextResponse.json(
      {
        error: "Requirements not met",
        checks: eligibilityChecks,
      },
      { status: 403 },
    );
  }

  // ── 6. Build & sign EIP-712 payload ─────────────────────────────────────

  const signerPrivateKey = process.env.BADGE_SIGNER_PRIVATE_KEY;
  if (!signerPrivateKey) {
    console.error("[sign-template-claim] BADGE_SIGNER_PRIVATE_KEY is not set");
    return NextResponse.json({ error: "Signer not configured on server" }, { status: 500 });
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS);
  const chain = getTargetChain();

  const domain = {
    name: "BadgeMinter",
    version: "1",
    chainId: BigInt(chain.id),
    verifyingContract: badgeMinterConfig.address,
  };

  let signature: `0x${string}`;
  let signerAddress: string;

  try {
    const account = privateKeyToAccount(signerPrivateKey as `0x${string}`);
    signerAddress = account.address;

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(getRpcUrl()),
    });

    signature = await walletClient.signTypedData({
      domain,
      types: TEMPLATE_CLAIM_TYPES,
      primaryType: "TemplateClaim",
      message: {
        user: userAddress,
        templateId: templateIdBigInt,
        deadline,
      },
    });
  } catch (err) {
    console.error("[sign-template-claim] Signing failed:", err);
    return NextResponse.json({ error: "Failed to sign claim", detail: String(err) }, { status: 500 });
  }

  // ── 7. Return result ─────────────────────────────────────────────────────

  return NextResponse.json({
    signature,
    signer: signerAddress,
    message: {
      user: userAddress,
      templateId: templateId.toString(),
      deadline: deadline.toString(),
    },
    templateId: templateId.toString(),
    badgeId: template.badgeId.toString(),
    deadline: deadline.toString(),
    eligibilityChecks,
  });
}
