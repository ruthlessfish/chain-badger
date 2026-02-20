"use client";

interface Props {
  isOpen: boolean;
  templateId: bigint;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * ArchiveConfirmModal — guards the irreversible archive action with a confirmation dialog.
 */
export function ArchiveConfirmModal({ isOpen, templateId, onConfirm, onCancel, isSubmitting }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card bg-base-100 border border-error/50 shadow-xl max-w-md w-full mx-4">
        <div className="card-body gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <h3 className="font-bold text-lg text-error">Archive Template #{templateId.toString()}?</h3>
          </div>

          <div className="alert alert-warning text-sm">
            <span>
              <strong>This action is permanent and irreversible.</strong> Once archived, this template cannot be
              reactivated and no new badges can be claimed. Existing badge holders keep their badges.
            </span>
          </div>

          <p className="text-sm text-base-content/70">Are you absolutely sure you want to archive this template?</p>

          <div className="card-actions justify-end gap-2 mt-2">
            <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="btn btn-error btn-sm" onClick={onConfirm} disabled={isSubmitting}>
              {isSubmitting && <span className="loading loading-spinner loading-xs" />}
              Yes, Archive Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
