export default function DeleteChapterModal({ open, chapterName, busy, onConfirm, onClose }) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-emerald-800 bg-[#111418] text-slate-200 shadow-xl">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-red-500">Delete chapter?</h3>
          </div>

          <div className="px-5 py-4 text-sm space-y-2">
            <p>
              This action will permanently remove{" "}
              <span className="text-emerald-400 font-medium">“{chapterName}”</span> from
              the list.
            </p>
            <p className="text-slate-400">This cannot be undone.</p>
          </div>

          <div className="px-5 py-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
              disabled={busy}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white"
              disabled={busy}
              onClick={onConfirm}
              type="button"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
