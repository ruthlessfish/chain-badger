/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */
"use client";

import { useMemo } from "react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import type { BadgeTemplate } from "~~/types/badge";
import { decodeRequirements } from "~~/utils/requirementsDecoder";

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

/**
 * useTemplates — fetches all badge templates from the BadgeTemplate contract.
 *
 * Reads nextTemplateId, then batches getTemplate() + templateClaimCount() calls
 * for every template ID. Optionally filters by creator address.
 *
 * Returns templates serialised to the frontend BadgeTemplate shape (bigints intact).
 */

interface UseTemplatesOptions {
  /** Only return templates from this creator address */
  creatorFilter?: string;
  /** Include archived templates (default: false) */
  includeArchived?: boolean;
}

interface UseTemplatesResult {
  templates: BadgeTemplate[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to read a single template by ID from BadgeTemplate contract.
 * Re-exported for use in detail pages.
 */
export function useTemplate(templateId: bigint | undefined) {
  const {
    data: rawTemplate,
    isLoading,
    error,
    refetch,
  } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "getTemplate",
    args: [templateId],
    query: { enabled: templateId !== undefined },
  });

  const { data: claimCount } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "templateClaimCount",
    args: [templateId],
    query: { enabled: templateId !== undefined },
  });

  const template = useMemo<BadgeTemplate | null>(() => {
    if (!rawTemplate) return null;
    const t = rawTemplate as {
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
    return {
      templateId: templateId!,
      badgeId: t.badgeId,
      creator: t.creator,
      metadataURI: t.metadataURI,
      requirements: decodeRequirements(t.requirements, t.templateVersion),
      requirementsHash: t.requirementsHash,
      templateVersion: t.templateVersion,
      maxClaims: t.maxClaims,
      claimCount: (claimCount as bigint | undefined) ?? 0n,
      active: t.active,
      archived: t.archived,
      createdAt: t.createdAt,
    };
  }, [rawTemplate, claimCount, templateId]);

  return { template, isLoading, error: error as Error | null, refetch };
}

/**
 * Hook to read the total number of templates created.
 */
export function useNextTemplateId() {
  return useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "nextTemplateId",
  });
}

/**
 * useTemplates — reads all templates and returns them as an array.
 *
 * Note: This calls getTemplate() for each template ID individually.
 * SE-2 doesn't support multi-call batching out of the box, so for a large
 * number of templates prefer using the /api/templates route instead.
 * This hook is suitable for local dev and small template counts (<50).
 */
export function useTemplates({ creatorFilter, includeArchived = false }: UseTemplatesOptions = {}): UseTemplatesResult {
  // Read total template count
  const {
    data: nextTemplateId,
    isLoading: countLoading,
    error: countError,
    refetch,
  } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "nextTemplateId",
  });

  // Read creator-specific IDs if a filter is set
  const { data: creatorTemplateIds, isLoading: creatorLoading } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "getTemplatesByCreator",
    args: [creatorFilter as `0x${string}` | undefined],
    query: { enabled: !!creatorFilter },
  });

  const count = Number((nextTemplateId as bigint | undefined) ?? 0n);

  // Build the list of IDs to fetch
  const idsToFetch = useMemo<bigint[]>(() => {
    if (creatorFilter && creatorTemplateIds) {
      return creatorTemplateIds as bigint[];
    }
    return Array.from({ length: count }, (_, i) => BigInt(i));
  }, [creatorFilter, creatorTemplateIds, count]);

  // Fetch template 0 (always; needed to prime the pattern — SE-2 hooks are per-call)
  const t0 = useSingleTemplate(idsToFetch[0]);
  const t1 = useSingleTemplate(idsToFetch[1]);
  const t2 = useSingleTemplate(idsToFetch[2]);
  const t3 = useSingleTemplate(idsToFetch[3]);
  const t4 = useSingleTemplate(idsToFetch[4]);
  const t5 = useSingleTemplate(idsToFetch[5]);
  const t6 = useSingleTemplate(idsToFetch[6]);
  const t7 = useSingleTemplate(idsToFetch[7]);
  const t8 = useSingleTemplate(idsToFetch[8]);
  const t9 = useSingleTemplate(idsToFetch[9]);
  const t10 = useSingleTemplate(idsToFetch[10]);
  const t11 = useSingleTemplate(idsToFetch[11]);
  const t12 = useSingleTemplate(idsToFetch[12]);
  const t13 = useSingleTemplate(idsToFetch[13]);
  const t14 = useSingleTemplate(idsToFetch[14]);
  const t15 = useSingleTemplate(idsToFetch[15]);
  const t16 = useSingleTemplate(idsToFetch[16]);
  const t17 = useSingleTemplate(idsToFetch[17]);
  const t18 = useSingleTemplate(idsToFetch[18]);
  const t19 = useSingleTemplate(idsToFetch[19]);

  const allSlots = [t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16, t17, t18, t19];

  const templates = useMemo<BadgeTemplate[]>(() => {
    const result: BadgeTemplate[] = [];
    for (let i = 0; i < idsToFetch.length && i < allSlots.length; i++) {
      const slot = allSlots[i];
      if (!slot.template) continue;
      if (!includeArchived && slot.template.archived) continue;
      result.push(slot.template);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsToFetch, includeArchived, ...allSlots.map(s => s.template)]);

  const loading =
    countLoading ||
    creatorLoading ||
    (idsToFetch.length > 0 && allSlots.slice(0, Math.min(idsToFetch.length, 20)).some(s => s.isLoading));
  const error = (countError as Error | null) ?? allSlots.find(s => s.error)?.error ?? null;

  return { templates, loading, error, refetch };
}

// ---------------------------------------------------------------------------
// Internal helper — reads one template + its claim count
// ---------------------------------------------------------------------------

function useSingleTemplate(templateId: bigint | undefined) {
  const enabled = templateId !== undefined;

  const {
    data: rawTemplate,
    isLoading,
    error,
  } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "getTemplate",
    args: [templateId],
    query: { enabled },
  });

  const { data: claimCount } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "templateClaimCount",
    args: [templateId],
    query: { enabled },
  });

  const template = useMemo<BadgeTemplate | null>(() => {
    if (!rawTemplate || !enabled) return null;
    const t = rawTemplate as {
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
    return {
      templateId: templateId!,
      badgeId: t.badgeId,
      creator: t.creator,
      metadataURI: t.metadataURI,
      requirements: decodeRequirements(t.requirements, t.templateVersion),
      requirementsHash: t.requirementsHash,
      templateVersion: t.templateVersion,
      maxClaims: t.maxClaims,
      claimCount: (claimCount as bigint | undefined) ?? 0n,
      active: t.active,
      archived: t.archived,
      createdAt: t.createdAt,
    };
  }, [rawTemplate, claimCount, templateId, enabled]);

  return { template, isLoading: enabled ? isLoading : false, error: error as Error | null };
}
