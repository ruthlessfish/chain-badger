"use client";

import { useState } from "react";
import { useTemplateAdminActions } from "~~/hooks/chainbadger/useTemplateAdminActions";

interface Props {
  templateId: bigint;
  currentURI: string;
  onSuccess?: () => void;
}

/**
 * EditMetadataForm — inline form to update a template's metadataURI.
 */
export function EditMetadataForm({ templateId, currentURI, onSuccess }: Props) {
  const [uri, setUri] = useState(currentURI);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { updateMetadataURI } = useTemplateAdminActions();

  const isDirty = uri.trim() !== currentURI;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uri.trim() || !isDirty) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await updateMetadataURI(templateId, uri.trim());
      setSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-2">
      <div className="form-control">
        <label className="label py-1">
          <span className="label-text text-sm">Metadata URI</span>
        </label>
        <input
          type="text"
          className="input input-sm input-bordered font-mono text-xs"
          value={uri}
          onChange={e => setUri(e.target.value)}
          placeholder="ipfs://… or https://…"
        />
        <label className="label py-0.5">
          <span className="label-text-alt text-base-content/40">IPFS URI, HTTP URL, or inline JSON</span>
        </label>
      </div>

      {error && (
        <div className="alert alert-error text-xs py-1">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success text-xs py-1">
          <span>Metadata URI updated!</span>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary btn-xs" disabled={!isDirty || !uri.trim() || submitting}>
          {submitting && <span className="loading loading-spinner loading-xs" />}
          Save URI
        </button>
      </div>
    </form>
  );
}
