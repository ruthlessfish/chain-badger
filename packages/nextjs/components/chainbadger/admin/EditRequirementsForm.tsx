"use client";

import { useState } from "react";
import { RequirementsBuilder } from "~~/components/chainbadger/templates/RequirementsBuilder";
import { useTemplateAdminActions } from "~~/hooks/chainbadger/useTemplateAdminActions";
import type { Requirements } from "~~/types/badge";

interface Props {
  templateId: bigint;
  currentRequirements: Requirements;
  onSuccess?: () => void;
}

/**
 * EditRequirementsForm — reuses RequirementsBuilder to let the template creator
 * update the encoded requirements bytes stored on-chain.
 */
export function EditRequirementsForm({ templateId, currentRequirements, onSuccess }: Props) {
  const [requirements, setRequirements] = useState<Requirements>(currentRequirements);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { updateRequirements } = useTemplateAdminActions();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await updateRequirements(templateId, requirements);
      setSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
      <RequirementsBuilder value={requirements} onChange={setRequirements} />

      {error && (
        <div className="alert alert-error text-xs py-1">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success text-xs py-1">
          <span>Requirements updated!</span>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary btn-xs" disabled={submitting}>
          {submitting && <span className="loading loading-spinner loading-xs" />}
          Save Requirements
        </button>
      </div>
    </form>
  );
}
