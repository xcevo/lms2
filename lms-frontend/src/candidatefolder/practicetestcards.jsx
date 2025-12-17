import { useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import API_BASE_URL from "../../config";
import { ChevronLeft } from "lucide-react";
import PracticeTestAppear from "./pacticetestappear";


/**
 * PracticeTestCards
 * - Default: modal (backdrop)
 * - Inline: set prop `inline` to true -> panel renders in-flow (no backdrop)
 */
export default function PracticeTestCards({
  open,
  onClose,
  subjectId,
  chapter,
  inline = false, // <-- NEW
}) {
  const [loading, setLoading] = useState(false);
  const [practice, setPractice] = useState(null);
  const [error, setError] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(null);

  // fetch on open (modal) OR when inline true
  useEffect(() => {
    if ((!open && !inline) || !subjectId || !chapter?._id) return;

    const load = async () => {
      setLoading(true);
      setError("");
      setPractice(null);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(
          `${API_BASE_URL}/api/candidate-test/subjects/${encodeURIComponent(
            subjectId
          )}/chapters/${encodeURIComponent(chapter._id)}/linked-practice`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load practice");
        setPractice(data?.practice || null);
      } catch (e) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, inline, subjectId, chapter?._id]);

  // partition by level
  const { easyCount, medCount, hardCount, title } = useMemo(() => {
    const qs = Array.isArray(practice?.questions) ? practice.questions : [];
    const norm = (v) => String(v || "").trim().toLowerCase();
    let e = 0, m = 0, h = 0;
    for (const q of qs) {
      const lvl = norm(q?.level);
      if (lvl === "easy") e++;
      else if (lvl === "medium") m++;
      else if (lvl === "hard") h++;
    }
    return { easyCount: e, medCount: m, hardCount: h, title: practice?.title || "Practice" };
  }, [practice]);

  // ---------- Inline mode ----------
 if (inline) {
   // Build level-wise question pools when practice is available
    const qs = Array.isArray(practice?.questions) ? practice.questions : [];
    const norm = (v) => String(v || "").trim().toLowerCase();
    const poolEasy   = qs.filter((q) => norm(q.level) === "easy");
    const poolMedium = qs.filter((q) => norm(q.level) === "medium");
    const poolHard   = qs.filter((q) => norm(q.level) === "hard");
    return (
      <>
        {/* slim header row */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-emerald-400 font-medium text-xl ml-6">
              Practice — <span className="text-slate-200">{chapter?.name || "Chapter"}</span>
            </h3>
            <p className="text-xs text-slate-400 ml-6">
              {title ? `Linked: ${title}` : loading ? "Loading..." : error ? "" : "No practice linked"}
            </p>
          </div>
          <button
            onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg mr-6 border border-emerald-700/70 bg-gradient-to-tl from-slate-800 to-slate-5900 hover:bg-white/10 px-3 py-1.5 text-lg text-slate-200"
        >
          <ChevronLeft size={16} className="text-emerald-400" /> Back to chapters
        </button>
        </div>

        {/* body (no bordered wrapper) */}
        {loading && <div className="text-slate-300">Loading practice test…</div>}
        {!loading && error && (
          <div className="rounded-lg border border-red-700/60 bg-red-900/20 text-red-200 px-3 py-2">
            {error}
          </div>
        )}
        {!loading && !error && !practice && (
          <div className="text-slate-300">No practice test linked with this chapter.</div>
        )}
         {/* If a level is chosen, render the inline runner here */}
        {!loading && !error && practice && selectedLevel && (
          <PracticeTestAppear
            level={selectedLevel}
            questions={
              selectedLevel === "easy"
                ? poolEasy
                : selectedLevel === "medium"
                ? poolMedium
                : poolHard
            }
            practiceId={practice?._id}
    subjectId={subjectId}
    chapterId={chapter?._id}
            onFinish={() => setSelectedLevel(null)}
          />
        )}

        {/* Otherwise show the three level cards */}
        {!loading && !error && practice && !selectedLevel && (
          <div className="px-6                         /* left/right padding = header/text ke ml-6/mr-6 se align */
            grid grid-cols-1
            sm:[grid-template-columns:repeat(3,30%)]  /* ~10% narrower cards */
            sm:justify-between               /* leftover 10% ko beech ke gaps me distribute */
            gap-y-6 sm:gap-x-0"> 
            <LevelCard title="Level — Easy"   count={easyCount}  accent="emerald" onClick={() => setSelectedLevel("easy")} />
            <LevelCard title="Level — Medium" count={medCount}  accent="amber"   onClick={() => setSelectedLevel("medium")} />
            <LevelCard title="Level — Hard"   count={hardCount} accent="rose"    onClick={() => setSelectedLevel("hard")} />
          </div>
        )}
      </>
    );
  }

  // ---------- Modal mode (unchanged) ----------
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed z-50 inset-0 flex items-start justify-center pt-14 sm:pt-20">
        <div
          className="w-full max-w-4xl rounded-2xl border border-emerald-900/70 
                     bg-black shadow-2xl overflow-hidden max-h-[82vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-900">
            <div>
              <h3 className="text-emerald-400 font-semibold">
                Practice — <span className="text-slate-200">{chapter?.name || "Chapter"}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {title ? `Linked: ${title}` : loading ? "Loading..." : error ? "" : "No practice linked"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded bg-white/5 border border-white/10 hover:bg-red-700 text-slate-300"
              aria-label="Close"
            >
              <FiX size={14} />
            </button>
          </div>

          <div className="p-6 overflow-auto">
            {loading && <div className="text-slate-300">Loading practice test…</div>}
            {!loading && error && (
              <div className="rounded-lg border border-red-700/60 bg-red-900/20 text-red-200 px-3 py-2">
                {error}
              </div>
            )}
            {!loading && !error && !practice && (
              <div className="text-slate-300">No practice test linked with this chapter.</div>
            )}
            {!loading && !error && practice && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <LevelCard title="Level — Easy"   count={easyCount}  accent="emerald" />
                <LevelCard title="Level — Medium" count={medCount}  accent="amber" />
                <LevelCard title="Level — Hard"   count={hardCount} accent="rose" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* --- Themed level card; size bumped --- */
function LevelCard({ title, count, accent = "emerald", onClick }) {
  const dot =
    accent === "amber" ? "bg-amber-400" : accent === "rose" ? "bg-rose-400" : "bg-emerald-400";
  const ring =
    accent === "amber"
      ? "ring-amber-400/25"
      : accent === "rose"
      ? "ring-rose-400/25"
      : "ring-emerald-400/25";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`relative group overflow-hidden rounded-2xl 
            border border-emerald-900/60 
            bg-gradient-to-tl from-slate-800 to-slate-5900 
            p-7 h-64 flex items-center justify-center cursor-pointer select-none
            shadow-[0_8px_24px_rgba(0,0,0,0.35)] 
            hover:shadow-[0_8px_16px_rgba(16,185,129,0.25)]
            transition`}

    >
      <span className={`pointer-events-none absolute inset-0 rounded-2xl ring-1 ${ring}`} />
      <span
        className="pointer-events-none absolute -inset-px rounded-[18px] opacity-0
                   group-hover:opacity-100 transition duration-500"
        style={{
          background:
            "radial-gradient(120% 60% at 80% 0%, rgba(185, 16, 86, 0.18), transparent 60%)",
        }}
      />
     <div className="relative z-10 flex flex-col items-center text-center">
    <div className="text-slate-200 font-semibold flex items-center gap-2 text-[25px] justify-center">
    <span className={`h-2 w-2 rounded-full ${dot}`} />
    {title}
    </div>
    <div className="mt-2 text-slate-300 text-sm">
    Questions: <span className="font-mono">{count}</span>
  </div>
</div>

    </div>
  );
}
