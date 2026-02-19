/**
 * GET /api/templates
 *
 * Returns all badge templates from the BadgeTemplate contract.
 * By default, archived templates are excluded.
 *
 * Query params:
 *   ?creator=0x...          — filter by creator address (optional)
 *   ?includeArchived=true   — include archived templates (default: false)
 *
 * Response:
 *   { templates: BadgeTemplate[] }
 *
 * The `requirements` field in each template is decoded from raw on-chain bytes
 * into a human-readable Requirements struct.
 *
 * Note: This route reads templates sequentially using nextTemplateId as the upper
 * bound. For production with many templates, consider adding a subgraph index.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import type { BadgeTemplate } from "~~/types/badge";
import { getContractConfig, getPublicClient } from "~~/utils/contractConfig";
import { decodeRequirements } from "~~/utils/requirementsDecoder";

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const creatorParam = searchParams.get("creator");
  const includeArchived = searchParams.get("includeArchived") === "true";

  // Validate optional creator filter
  if (creatorParam && !isAddress(creatorParam)) {
    return NextResponse.json({ error: "Invalid `creator` address" }, { status: 400 });
  }
  const creatorFilter = creatorParam ? getAddress(creatorParam) : null;

  // ── Load contract config ─────────────────────────────────────────────────

  let badgeTemplateConfig: Awaited<ReturnType<typeof getContractConfig>>;
  try {
    badgeTemplateConfig = await getContractConfig("BadgeTemplate");
  } catch (err) {
    return NextResponse.json(
      { error: "Contracts not deployed. Run `yarn deploy` first.", detail: String(err) },
      { status: 500 },
    );
  }

  const publicClient = getPublicClient();

  // ── Read nextTemplateId to know how many templates exist ─────────────────

  let nextTemplateId: bigint;
  try {
    nextTemplateId = (await publicClient.readContract({
      address: badgeTemplateConfig.address,
      abi: badgeTemplateConfig.abi as never[],
      functionName: "nextTemplateId",
    })) as bigint;
  } catch (err) {
    return NextResponse.json({ error: "Failed to read contract", detail: String(err) }, { status: 500 });
  }

  if (nextTemplateId === 0n) {
    return NextResponse.json({ templates: [] });
  }

  // ── If creator filter is set, use getTemplatesByCreator for efficiency ────

  let templateIds: bigint[];

  if (creatorFilter) {
    try {
      templateIds = (await publicClient.readContract({
        address: badgeTemplateConfig.address,
        abi: badgeTemplateConfig.abi as never[],
        functionName: "getTemplatesByCreator",
        args: [creatorFilter],
      })) as bigint[];
    } catch (err) {
      return NextResponse.json({ error: "Failed to fetch creator templates", detail: String(err) }, { status: 500 });
    }
  } else {
    // All templates: 0 … nextTemplateId - 1
    templateIds = Array.from({ length: Number(nextTemplateId) }, (_, i) => BigInt(i));
  }

  if (templateIds.length === 0) {
    return NextResponse.json({ templates: [] });
  }

  // ── Batch fetch template data + claim counts ─────────────────────────────

  let rawTemplates: Array<{
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
  }>;

  let claimCounts: bigint[];

  try {
    [rawTemplates, claimCounts] = await Promise.all([
      Promise.all(
        templateIds.map(id =>
          publicClient.readContract({
            address: badgeTemplateConfig.address,
            abi: badgeTemplateConfig.abi as never[],
            functionName: "getTemplate",
            args: [id],
          }),
        ),
      ) as Promise<typeof rawTemplates>,
      Promise.all(
        templateIds.map(id =>
          publicClient.readContract({
            address: badgeTemplateConfig.address,
            abi: badgeTemplateConfig.abi as never[],
            functionName: "templateClaimCount",
            args: [id],
          }),
        ),
      ) as Promise<bigint[]>,
    ]);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch template data", detail: String(err) }, { status: 500 });
  }

  // ── Build response, decode requirements, apply filters ───────────────────

  const templates: BadgeTemplate[] = [];

  for (let i = 0; i < templateIds.length; i++) {
    const t = rawTemplates[i];
    const templateId = templateIds[i];

    // Apply archived filter
    if (!includeArchived && t.archived) continue;

    let requirements;
    try {
      requirements = decodeRequirements(t.requirements, t.templateVersion);
    } catch {
      // If decoding fails, fall back to empty requirements so the template still appears
      requirements = {
        token: "0x0000000000000000000000000000000000000000",
        minBalance: 0n,
        minXP: 0n,
        mustFollowCreator: false,
      };
    }

    templates.push({
      templateId,
      badgeId: t.badgeId,
      creator: t.creator,
      metadataURI: t.metadataURI,
      requirements,
      requirementsHash: t.requirementsHash,
      templateVersion: t.templateVersion,
      maxClaims: t.maxClaims,
      claimCount: claimCounts[i],
      active: t.active,
      archived: t.archived,
      createdAt: t.createdAt,
    });
  }

  // Serialize bigints to strings for JSON transport
  const serialized = templates.map(t => ({
    ...t,
    templateId: t.templateId.toString(),
    badgeId: t.badgeId.toString(),
    requirements: {
      ...t.requirements,
      minBalance: t.requirements.minBalance.toString(),
      minXP: t.requirements.minXP.toString(),
    },
    maxClaims: t.maxClaims.toString(),
    claimCount: t.claimCount.toString(),
    createdAt: t.createdAt.toString(),
  }));

  return NextResponse.json({ templates: serialized });
}
