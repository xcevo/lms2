import { useEffect } from "react";
import API_BASE_URL from "../../../config";

export default function VideoPopup({ open, subjectId, chapter, onClose }) {
  if (!open) return null;

  // public video stream endpoint built in backend
  const url =
    subjectId && chapter?._id
      ? `${API_BASE_URL}/api/admin-subject/public/${encodeURIComponent(
          subjectId
        )}/chapter/${encodeURIComponent(chapter._id)}/video`
      : "";

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="max-w-4xl w-[92vw] mx-auto mt-24 rounded-xl border border-green-600/40 bg-white/5 text-slate-200 shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-lg font-semibold text-green-400">
            Play Video — <span className="text-slate-300">{chapter?.name || ""}</span>
          </h3>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm rounded bg-white/5 border border-white/10 hover:bg-red-600"
          >
            X
          </button>
        </div>

        {/* body */}
        <div className="p-4">
          {chapter?.videoPath ? (
            <video
              key={url}               // ensure reload if switching chapters
              src={url}
              controls
              preload="metadata"
              className="w-full rounded-lg border border-white/10"
            />
          ) : (
            <div className="p-6 text-slate-300">
              No video uploaded for this chapter.
            </div>
          )}
        </div>

        {/* footer with “open in new tab” */}
        {chapter?.videoPath ? (
          <div className="px-5 pb-4">
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-block px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm"
            >
              Open in new tab
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
