import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import Tooltip from "../../components/tooltip";

export default function SubjectTestPreview({ open, onClose, title, questions }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl max-h-[85vh] overflow-hidden rounded-xl border border-emerald-700 bg-white/5">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-xl font-semibold text-emerald-400">
            Subject Test Preview: <span className="text-slate-200">{title}</span>
          </h3>
          <Tooltip text="close">
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-red-700 text-slate-300"
            aria-label="Close"
            title="Close"
          >
            <FiX size={16} />
          </button>
          </Tooltip>
        </div>

        {/* Table wrapper (scroll) */}
        <div className="overflow-auto max-h-[70vh] px-4 pb-4">
          <table className="w-full text-sm text-slate-200">
            <thead className="sticky top-0 bg-[#0b1320]">
              <tr className="text-emerald-300 [&>th]:px-3 [&>th]:py-2 text-left border-b border-white/10">
                <th>Question</th>
                <th className="w-[14%]">A</th>
                <th className="w-[14%]">B</th>
                <th className="w-[14%]">C</th>
                <th className="w-[14%]">D</th>
                <th className="w-[14%]">Answer</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-white/5">
              {Array.isArray(questions) && questions.length > 0 ? (
                questions.map((q, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="px-3 py-2">{q.Question}</td>
                    <td className="px-3 py-2">{q.A}</td>
                    <td className="px-3 py-2">{q.B}</td>
                    <td className="px-3 py-2">{q.C}</td>
                    <td className="px-3 py-2">{q.D}</td>
                    <td className="px-3 py-2 font-medium text-emerald-300">{q.Answer}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No rows in this test.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
