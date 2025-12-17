import { useMemo } from "react";
import { X, BookOpen } from "lucide-react";
import Tooltip from "../components/tooltip";
import { BsFillArrowLeftSquareFill } from "react-icons/bs";

export default function LeftSidebar({
  chapter,
  onClose,                // close Learn view (back to chapters)
  onSelectTopic,          // (topic) => void
  activeTopicId,          // string | null
}) {
  const topics = useMemo(() => Array.isArray(chapter?.topics) ? chapter.topics : [], [chapter]);

  return (
    <aside
      aria-label="Topics list"
      className="
        fixed left-0 top-12 bottom-0 z-30
        w-48 sm:w-54 border-r border-slate-800
        bg-white/5 text-slate-100
        shadow-[0_0_24px_rgba(16,185,129,.18)]
      "
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-black/30">
        <div className="text-xs uppercase tracking-wider text-slate-300">Topics</div>
        <Tooltip text="Back to chapters">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center w-7 h-7 text-slate-100 rounded-md hover:bg-red-700 text-slate-300"
          
        >
          <BsFillArrowLeftSquareFill size={16} />
        </button>
        </Tooltip>
      </div>

      <div className="px-3 pt-2 pb-3 border-b border-slate-800">
        
        <div className="mt-0.5 text-sm font-medium text-emerald-400 line-clamp-1">
          {chapter?.name ?? "—"}
        </div>
      </div>

      <div className="h-[calc(100%-92px)] overflow-y-auto pr-2 pl-3 py-3">
        {!topics.length ? (
          <div className="text-sm text-slate-400">No topics yet.</div>
        ) : (
          <ul className="space-y-2">
            {topics.map((t) => {
              const active = t._id === activeTopicId;
              return (
                <li key={t._id || t.name}>
                  <button
                    type="button"
                    onClick={() => onSelectTopic?.(t)}
                    className={`w-full text-left flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm
                      ${active
                        ? "border-emerald-900 bg-[#1e1e1e] text-green-400"
                        : "border-slate-800 bg-white/5 hover:bg-white/10 text-slate-200"
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {t.name}
                    </span>
                    <span className="text-[11px] text-slate-300 flex items-center gap-1">
                      <BookOpen size={14} /> p{t.pdfPage ?? "?"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
