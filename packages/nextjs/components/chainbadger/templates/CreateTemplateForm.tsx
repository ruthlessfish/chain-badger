"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RequirementsBuilder } from "./RequirementsBuilder";
import { TemplatePreview } from "./TemplatePreview";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Requirements } from "~~/types/badge";
import { EMPTY_REQUIREMENTS, encodeRequirements } from "~~/utils/requirementsDecoder";

// ---------------------------------------------------------------------------
// Multi-step form state
// ---------------------------------------------------------------------------
type Step = "metadata" | "requirements" | "review";

const STEPS: Step[] = ["metadata", "requirements", "review"];
const STEP_LABELS: Record<Step, string> = {
  metadata: "Badge Info",
  requirements: "Requirements",
  review: "Review & Create",
};

interface FormState {
  name: string;
  description: string;
  imageUri: string;
  category: string;
  maxClaims: string;
  requirements: Requirements;
}

const DEFAULT_STATE: FormState = {
  name: "",
  description: "",
  imageUri: "",
  category: "",
  maxClaims: "0",
  requirements: EMPTY_REQUIREMENTS,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateTemplateForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("metadata");
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [txError, setTxError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTemplateId, setCreatedTemplateId] = useState<bigint | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "BadgeTemplate" });

  // ── Navigation helpers ─────────────────────────────────────────────────
  const currentIndex = STEPS.indexOf(step);
  const canGoBack = currentIndex > 0;
  const isLastStep = step === "review";

  function prev() {
    if (canGoBack) setStep(STEPS[currentIndex - 1]);
  }
  function next() {
    if (!isLastStep) setStep(STEPS[currentIndex + 1]);
  }

  // ── Metadata JSON builder ──────────────────────────────────────────────
  function buildMetadataURI(): string {
    const meta: Record<string, string> = { name: form.name, description: form.description };
    if (form.imageUri) meta.image = form.imageUri;
    if (form.category) meta.category = form.category;
    return JSON.stringify(meta);
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setTxError(null);
    setSubmitting(true);

    const metadataURI = buildMetadataURI();
    const requirementsBytes = encodeRequirements(form.requirements);
    const maxClaims = BigInt(form.maxClaims || "0");

    try {
      await writeContractAsync({
        functionName: "createTemplate",
        args: [metadataURI, requirementsBytes, maxClaims],
        // We can't easily get the return values from a write tx via SE-2,
        // so we navigate to /templates after success and let the user find theirs.
      });

      // If we get here, tx succeeded
      setCreatedTemplateId(0n); // placeholder — real ID would come from event
      setStep("review");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTxError(msg.includes("EmptyMetadataURI") ? "Metadata URI cannot be empty." : msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (createdTemplateId !== null && step === "review" && !submitting) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold">Badge Template Created!</h2>
        <p className="text-base-content/60 max-w-sm">
          Your badge template is live on-chain. Users can now discover and claim it.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => router.push("/templates")}>
            View All Badges
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setForm(DEFAULT_STATE);
              setCreatedTemplateId(null);
              setStep("metadata");
            }}
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  // ── Stepper UI ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Steps indicator */}
      <ul className="steps w-full">
        {STEPS.map((s, i) => (
          <li key={s} className={`step text-sm ${i <= currentIndex ? "step-primary" : ""}`}>
            {STEP_LABELS[s]}
          </li>
        ))}
      </ul>

      {/* ── Step: Metadata ───────────────────────────────────────────── */}
      {step === "metadata" && (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg">Badge Information</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Name *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="e.g. Early Adopter"
                maxLength={80}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered resize-none"
                rows={3}
                placeholder="What does this badge represent?"
                maxLength={280}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Image URI</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="https:// or ipfs://"
                  value={form.imageUri}
                  onChange={e => setForm(f => ({ ...f, imageUri: e.target.value }))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Category</span>
                </label>
                <select
                  className="select select-bordered"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="">None</option>
                  {["Community", "DeFi", "Gaming", "Education", "Event", "Other"].map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Max Claims</span>
                <span className="label-text-alt text-base-content/50">0 = unlimited</span>
              </label>
              <input
                type="number"
                min="0"
                className="input input-bordered"
                placeholder="0"
                value={form.maxClaims}
                onChange={e => setForm(f => ({ ...f, maxClaims: e.target.value }))}
              />
            </div>

            <div className="card-actions justify-end pt-2">
              <button className="btn btn-primary" disabled={!form.name.trim()} onClick={next}>
                Next: Requirements →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step: Requirements ───────────────────────────────────────── */}
      {step === "requirements" && (
        <div className="flex flex-col gap-4">
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body gap-4">
              <h2 className="card-title text-lg">Badge Requirements</h2>
              <p className="text-sm text-base-content/60">
                Define who can claim this badge. Leave everything unchecked for an open badge.
              </p>
              <RequirementsBuilder
                value={form.requirements}
                onChange={req => setForm(f => ({ ...f, requirements: req }))}
              />
            </div>
          </div>

          {/* Live preview */}
          <TemplatePreview
            name={form.name}
            description={form.description}
            imageUri={form.imageUri}
            maxClaims={form.maxClaims}
            requirements={form.requirements}
          />

          <div className="flex justify-between">
            <button className="btn btn-ghost" onClick={prev}>
              ← Back
            </button>
            <button className="btn btn-primary" onClick={next}>
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Review ─────────────────────────────────────────────── */}
      {step === "review" && (
        <div className="flex flex-col gap-4">
          <TemplatePreview
            name={form.name}
            description={form.description}
            imageUri={form.imageUri}
            maxClaims={form.maxClaims}
            requirements={form.requirements}
          />

          <div className="card bg-base-200 border border-base-300">
            <div className="card-body gap-2">
              <h2 className="card-title text-base">On-chain Summary</h2>
              <div className="text-sm text-base-content/60 space-y-1">
                <p>
                  <span className="font-medium text-base-content">Name:</span> {form.name}
                </p>
                <p>
                  <span className="font-medium text-base-content">Max Claims:</span>{" "}
                  {Number(form.maxClaims) === 0 ? "Unlimited" : form.maxClaims}
                </p>
                <p className="text-xs text-base-content/40 mt-2">
                  Metadata is stored as JSON in the metadataURI field on-chain. Requirements are ABI-encoded as bytes.
                  Creating a template costs gas.
                </p>
              </div>
            </div>
          </div>

          {txError && (
            <div className="alert alert-error text-sm">
              <span>{txError}</span>
            </div>
          )}

          <div className="flex justify-between">
            <button className="btn btn-ghost" onClick={prev} disabled={submitting}>
              ← Back
            </button>
            <button className="btn btn-primary min-w-32" onClick={handleSubmit} disabled={submitting}>
              {submitting && <span className="loading loading-spinner loading-sm mr-2" />}
              {submitting ? "Creating…" : "Create Badge 🏅"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
