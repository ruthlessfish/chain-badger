"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TemplateDetail } from "~~/components/chainbadger/templates";
import { useTemplate } from "~~/hooks/chainbadger/useTemplates";

export default function TemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const templateId = params?.templateId ? BigInt(params.templateId) : undefined;

  const { template, isLoading, error } = useTemplate(templateId);

  if (isLoading || templateId === undefined) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body gap-4">
              <div className="flex gap-4">
                <div className="skeleton w-24 h-24 rounded-2xl" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton h-6 w-3/4 rounded" />
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
              <div className="skeleton h-3 w-full rounded" />
            </div>
          </div>
          <div className="skeleton h-28 w-full rounded-2xl" />
          <div className="skeleton h-28 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error || !template) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 py-20 text-center">
          <span className="text-5xl">🔍</span>
          <h1 className="text-2xl font-bold">Badge not found</h1>
          <p className="text-base-content/60 text-sm">
            Template #{params?.templateId} doesn&apos;t exist or failed to load.
          </p>
          <Link href="/templates" className="btn btn-primary btn-sm">
            ← Back to Gallery
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <Link
          href="/templates"
          className="text-sm text-base-content/50 hover:text-base-content flex items-center gap-1 w-fit"
        >
          ← Back to Gallery
        </Link>
        <TemplateDetail template={template} />
      </div>
    </main>
  );
}
