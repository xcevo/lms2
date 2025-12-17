import React, { useEffect } from "react";

/**
 * Reusable delete-confirmation modal
 * Props:
 * - open: boolean
 * - subjectName?: string
 * - busy?: boolean  // disables buttons while deleting
 * - onConfirm: () => void
 * - onClose: () => void
 */
export default function DeleteSubjectModal({
  open,
  subjectName,
  busy = false,
  onConfirm,
  onClose,
}) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* overlay with blur (matches other modals’ look) */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!busy ? onClose : undefined}
      />

      {/* modal card */}
      <div className="relative z-10 w-[min(420px,94vw)] rounded-lg border-[0.3px] border-emerald-800 bg-white/5 shadow-xl">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-slate-100">Delete subject?</h3>
        </div>

        <div className="px-5 py-4 text-slate-300">
          <p className="leading-relaxed">
            This action will permanently remove
            {subjectName ? (
              <>
                {" "}
                <span className="font-semibold text-emerald-500">“{subjectName}”</span>
              </>
            ) : null}
            {" "}from the list.
          </p>
          <p className="mt-2 text-slate-400">This cannot be undone.</p>
        </div>

        <div className="px-5 py-4 flex items-center justify-end gap-2 border-t border-white/10">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-2 py-1 rounded-xl text-sm bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="px-2 py-1 rounded-xl text-sm bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
