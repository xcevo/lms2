// src/adminfolder/adminModels/practicetestpreview.jsx
import { useEffect } from "react";

export default function PracticeTestPreview({ open, onClose, title, questions = [] }) {
  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        // close only when clicking backdrop
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-[min(1100px,96vw)] max-h-[86vh] overflow-hidden
                      rounded-2xl border border-emerald-600/50 bg-[#0b0f12] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.04]">
          <div className="text-slate-200">
            <div className="text-base font-semibold">{title || "Practice Preview"}</div>
            <div className="text-xs text-slate-400">
              Total Questions: {questions?.length ?? 0}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-slate-200"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[72vh] text-slate-200">
          {Array.isArray(questions) && questions.length > 0 ? (
            <ol className="space-y-4 list-decimal pl-6 pr-1">
              {questions.map((q, i) => (
                <li key={i} className="bg-white/5 rounded-lg border border-white/10">
                  <div className="px-4 py-3">
                    <div className="font-medium">
                      {q?.question || "—"}
                      {q?.level ? (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-700/40 text-emerald-300 border border-emerald-600/40">
                          {q.level}
                        </span>
                      ) : null}
                    </div>

                    {/* Options */}
                    {Array.isArray(q?.options) && q.options.length > 0 && (
                      <ul className="mt-2 grid md:grid-cols-2 gap-2">
                        {q.options.map((opt, idx) => {
                          const isCorrect =
                            typeof q.correctIndex === "number"
                              ? idx === q.correctIndex
                              : String(opt).trim() === String(q.correctAnswer ?? "").trim();

                          return (
                            <li
                              key={idx}
                              className={`px-3 py-2 rounded border text-sm ${
                                isCorrect
                                  ? "border-emerald-600 bg-emerald-600/10"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              {opt}
                              {isCorrect && (
                                <span className="ml-2 text-emerald-400 text-xs">(correct)</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-center text-slate-400">No questions to preview.</div>
          )}
        </div>
      </div>
    </div>
  );
}
