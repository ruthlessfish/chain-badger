"use client";

import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useTemplate } from "~~/hooks/chainbadger/useTemplates";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

// ---------------------------------------------------------------------------
// Single earned badge card (loads template metadata for display)
// ---------------------------------------------------------------------------
function EarnedBadgeCard({ templateId, badgeId }: { templateId: bigint; badgeId: bigint }) {
  const { template, isLoading } = useTemplate(templateId);

  let name = `Badge #${badgeId.toString()}`;
  let description = "";
  let imageUri: string | null = null;

  if (template) {
    try {
      if (template.metadataURI.startsWith("{")) {
        const meta = JSON.parse(template.metadataURI);
        name = meta.name ?? name;
        description = meta.description ?? "";
        imageUri = meta.image ?? null;
      } else {
        imageUri = template.metadataURI;
      }
    } catch {
      imageUri = null;
    }
  }

  if (isLoading) {
    return (
      <div className="card bg-base-200 border border-base-300">
        <div className="skeleton h-32 w-full rounded-t-2xl" />
        <div className="card-body p-3 gap-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/templates/${templateId.toString()}`}
      className="group card bg-base-200 border border-base-300 hover:border-primary/50 hover:shadow-md transition-all duration-200"
    >
      <figure className="h-32 bg-base-300 flex items-center justify-center overflow-hidden rounded-t-2xl">
        {imageUri ? (
          <Image
            src={imageUri}
            alt={name}
            width={128}
            height={128}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            unoptimized={imageUri.startsWith("ipfs://") || imageUri.startsWith("data:")}
          />
        ) : (
          <span className="text-4xl">🏅</span>
        )}
      </figure>
      <div className="card-body p-3 gap-1">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{name}</p>
        {description && <p className="text-xs text-base-content/50 line-clamp-2">{description}</p>}
        <p className="text-xs text-base-content/30 mt-0.5">Badge #{badgeId.toString()}</p>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const MyBadges: NextPage = () => {
  const { address, isConnected } = useAccount();

  const { data: claimEvents, isLoading: eventsLoading } = useScaffoldEventHistory({
    contractName: "BadgeMinter",
    eventName: "TemplateBadgeClaimed",
    fromBlock: 0n,
    filters: { user: address },
    watch: true,
  });

  // Deduplicate by badgeId in case the event fires multiple times
  const uniqueEvents = (() => {
    const seen = new Set<string>();
    return (claimEvents ?? []).filter(e => {
      const key = e.args.badgeId?.toString() ?? "";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-bold">My Badge Collection</h1>
          <p className="text-base-content/60">Your on-chain achievements, verifiable and truly yours</p>
          {address && <p className="text-xs text-base-content/40 font-mono mt-1">{address}</p>}
        </div>

        {/* Not connected */}
        {!isConnected && (
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body items-center text-center gap-4 py-16">
              <span className="text-5xl">🔒</span>
              <p className="text-lg font-semibold">Connect your wallet</p>
              <p className="text-sm text-base-content/60">Connect to see your earned badges.</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isConnected && eventsLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="card bg-base-200 border border-base-300">
                <div className="skeleton h-32 w-full rounded-t-2xl" />
                <div className="card-body p-3 gap-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isConnected && !eventsLoading && uniqueEvents.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-20 text-center">
            <span className="text-6xl">🏅</span>
            <p className="text-xl font-semibold">No badges yet</p>
            <p className="text-base-content/60 max-w-sm text-sm">
              Head to the badge gallery and claim your first on-chain achievement.
            </p>
            <Link href="/templates" className="btn btn-primary btn-sm">
              Browse Badges
            </Link>
          </div>
        )}

        {/* Badge grid */}
        {isConnected && !eventsLoading && uniqueEvents.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-base-content/50">
              {uniqueEvents.length} badge{uniqueEvents.length !== 1 ? "s" : ""} earned
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {uniqueEvents.map(event => (
                <EarnedBadgeCard
                  key={event.args.badgeId?.toString()}
                  templateId={event.args.templateId as bigint}
                  badgeId={event.args.badgeId as bigint}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default MyBadges;
