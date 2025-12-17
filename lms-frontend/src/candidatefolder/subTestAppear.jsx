import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import API_BASE_URL from "../../config";
import Tooltip from "../components/tooltip";
import { toast } from "react-toastify";

/** mm:ss formatter */
function fmtMMSS(secs) {
  if (secs == null) return "—";
  const m = Math.max(0, Math.floor(secs / 60));
  const s = Math.max(0, secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Subject-level test appear (no shuffle, no submit API).
 * Props:
 * - subject: { _id, name }
 * - onBack: () => void
 */
export default function SubTestAppear({ subject, onBack }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [test, setTest] = useState(null);

  // visible questions (subject tests have NO randomized count, so show all)
  const [qList, setQList] = useState([]);
  // selections: { [qIndex]: 'A'|'B'|'C'|'D' }
  const [answers, setAnswers] = useState({});
  // countdown & freeze after time ends
 const [secondsLeft, setSecondsLeft] = useState(null);
 const [isFrozen, setIsFrozen] = useState(false);
 const [attemptCount, setAttemptCount] = useState(0);
 const [result, setResult] = useState(null); // { scorePercentage, status }
 const autoLockedRef = useRef(false);

  // fetch linked subject tests and pick the first
  useEffect(() => {
    const go = async () => {
      if (!subject?._id) return;
      try {
        setLoading(true);
        setErr("");
        setTest(null);
        setQList([]);
        setAnswers({});
        setIsFrozen(false);
        setSecondsLeft(null);
        autoLockedRef.current = false;

        const token = localStorage.getItem("token");
        const url = `${API_BASE_URL}/api/candidate-test/subject/${subject._id}/subject-tests`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || "Failed to load subject tests.");
        }
        const data = await res.json();
        const list = Array.isArray(data?.tests) ? data.tests : [];
        if (!list.length) throw new Error("No subject test linked to this subject.");

        
        // pick a random linked test
        const t = list[Math.floor(Math.random() * list.length)];

        if (!Array.isArray(t?.questions) || !t.questions.length) {
          throw new Error("This subject test has no questions.");
        }

        setTest(t);
        setQList(t.questions); // all as-is (no shuffle/no subset)

        const mins = Number(t?.duration ?? 0);
        const totalSecs = Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : null;
        setSecondsLeft(totalSecs);
      } catch (e) {
        setErr(e.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    go();
  }, [subject?._id]);

  const title = useMemo(() => test?.title || subject?.name || "Test", [test, subject]);

    const allAnswered = useMemo(() => {
    if (!qList.length) return false;
    for (let i = 0; i < qList.length; i++) if (!answers[i]) return false;
    return true;
  }, [qList, answers]);

  // add this:
const handleSelect = useCallback((qIdx, optionKey) => {
  if (isFrozen) return;                  // lock hone par allow nahin
  setAnswers(prev => ({ ...prev, [qIdx]: optionKey }));
}, [isFrozen]);


  const onSubmit = useCallback(async (force = false) => {
    // manual submit tabhi jab sab answered; auto-submit (force=true) partial allow
    if ((!force && !allAnswered) || !qList.length) return;
    // payload build (subject tests me shuffle nahi — index = visible index)
    const payloadAnswers = Object.entries(answers).map(([idx, opt]) => ({
      index: Number(idx),
      selected: opt,
    }));
    if (force && payloadAnswers.length === 0) { setIsFrozen(true); return; }

   // ⬇️ compute time taken in seconds (duration*60 - secondsLeft), clamp to [0, duration*60]
   const totalSecs = Math.round(Number(test?.duration ?? 0) * 60);
   let timeTaken = (Number.isFinite(totalSecs) && secondsLeft != null)
     ? (totalSecs - secondsLeft) : 0;
   // clamp
   if (!Number.isFinite(timeTaken) || timeTaken < 0) timeTaken = 0;
   if (totalSecs > 0 && timeTaken > totalSecs) timeTaken = totalSecs;
   // ✅ auto-submit (timeout) => always full duration
   if (force && totalSecs > 0) timeTaken = totalSecs;


    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE_URL}/api/candidate-test/subject/${subject?._id}/subject-tests/submit`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectTestId: test?._id,
          answers: payloadAnswers,
          timeTakenSec: timeTaken
        }),
      });

      // already passed earlier → 409 (locked)
      if (res.status === 409) {
        const dj = await res.json().catch(() => ({}));
        const r = dj?.result || {};
         setResult({
         scorePercentage: r.scorePercentage ?? 0,
         status: r.status ?? "pass",
         timeTakenSec: timeTaken, // best-effort (server 409 par time nahi bhejta)
       });
        setIsFrozen(true);
        return;
      }

      if (!res.ok) {
        const dj = await res.json().catch(() => ({}));
        throw new Error(dj?.message || "Submit failed");
      }

      const data = await res.json();
      const g = data?.grading || {};
      const srvTime = Number(g?.timeTakenSec);
      setAttemptCount((c) => c + 1);
      setResult({
        scorePercentage: Math.round((g.scorePercentage ?? 0) * 100) / 100,
        status: g.passed ? "pass" : "fail",
        timeTakenSec: Number.isFinite(srvTime) ? srvTime : timeTaken,
      });
      setIsFrozen(true);
    } catch (e) {
      console.error(e);
    }
  }, [allAnswered, qList, answers, subject?._id, test?._id]);



  // countdown
  useEffect(() => {
    if (secondsLeft == null || isFrozen) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s == null) return s;
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft, isFrozen]);

 // time 0 → auto submit (agar kuch answers diye hain), warna freeze
 useEffect(() => {
   if (secondsLeft === 0 && !isFrozen && !autoLockedRef.current) {
     autoLockedRef.current = true;
     toast.error('You ran out of time');
     if (Object.keys(answers || {}).length > 0) {
       onSubmit(true); // force=true → partial allowed
     } else {
       setIsFrozen(true);
     }
   }
 }, [secondsLeft, isFrozen, answers, onSubmit]);

 // freeze hone par timer 0 show karo (visual parity with chapter test)
 useEffect(() => {
   if (isFrozen) setSecondsLeft((s) => (s == null ? s : 0));
 }, [isFrozen]);

  if (loading) {
    return (
      <section className="px-4 sm:px-6 md:px-8">
        <div className="rounded-xl border border-emerald-800/60 bg-white/5 text-emerald-200 px-4 py-3">
          Loading subject test…
        </div>
      </section>
    );
  }

  if (err) {
    return (
      <section className="px-4 sm:px-6 md:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-emerald-400 font-medium text-xl">
            Test — <span className="opacity-90">{subject?.name}</span>
          </h2>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/70 bg-gradient-to-tl from-slate-800 to-slate-5900 hover:bg-white/10 px-3 py-1.5 text-lg text-slate-200"
          >
            <ChevronLeft size={16} className="text-emerald-400" /> Back to subjects
          </button>
        </div>
        <div className="rounded-xl border border-red-700/60 bg-red-900/20 text-red-200 px-4 py-3">
          {err}
        </div>
      </section>
    );
  }

  return (
    <>
      <style>{`
        .scroll-emerald{
          scrollbar-width: thin;
          scrollbar-color: rgba(16,185,129,.75) rgba(15,23,42,.35);
        }
        .scroll-emerald::-webkit-scrollbar{ width: 10px; }
        .scroll-emerald::-webkit-scrollbar-track{
          background: rgba(2,6,23,.35);
          border-radius: 12px;
        }
        .scroll-emerald::-webkit-scrollbar-thumb{
          background: linear-gradient(180deg, rgba(16,185,129,.75), rgba(5,150,105,.65));
          border: 1px solid rgba(16,185,129,.45);
          border-radius: 12px;
        }
        .scroll-emerald::-webkit-scrollbar-thumb:hover{
          background: linear-gradient(180deg, rgba(16,185,129,.9), rgba(5,150,105,.8));
        }
      `}</style>

      <section className="px-4 sm:px-6 md:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-emerald-400 font-medium text-xl">
            Test — <span className="opacity-90">{subject?.name}</span>
          </h2>

          <div className="flex items-center gap-2">
            {/* No Shuffle button for subject tests */}
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/70 bg-gradient-to-tl from-slate-800 to-slate-5900 hover:bg-white/10 px-3 py-1.5 text-lg text-slate-200"
            >
              <ChevronLeft size={16} className="text-emerald-400" /> Back to subjects
            </button>
          </div>
        </div>

        {/* 70/30 like chapterTest.jsx */}
        <div className="grid grid-cols-10 gap-6 items-start lg:h-[calc(100vh-140px)] overflow-hidden">
          {/* LEFT: Questions */}
          <div className="col-span-10 lg:col-span-7 space-y-6 overflow-y-auto pr-1 lg:pr-2 h-full scroll-emerald">
            {qList.map((q, idx) => {
              const name = `q_${idx}`;
              const selected = answers[idx];
              const opt = (key, labelPrefix) => {
                const id = `${name}_${key}`;
                return (
                  <label
                    htmlFor={id}
                    className={`flex items-center gap-3 rounded-lg border border-slate-800 bg-white/5 px-3 py-3
                      ${isFrozen ? "opacity-60 cursor-not-allowed" :
                        `cursor-pointer transition ${selected === key ? "ring-1 ring-emerald-500/40 bg-emerald-900/10" : "hover:bg-white/10"}`}`}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={name}
                      className="accent-emerald-500"
                      checked={selected === key}
                      onChange={() => handleSelect(idx, key)}
                      disabled={isFrozen}
                    />
                    <span className="text-slate-200">
                      <span className="text-emerald-300">{labelPrefix}. </span>
                      {q?.[key] ?? "—"}
                    </span>
                  </label>
                );
              };

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-900/60 bg-gradient-to-tl from-slate-800 to-slate-5900 p-3"
                >
                  <div className="px-1 pb-3 text-emerald-300 font-medium">
                    Q{idx + 1}. {q?.Question ?? "—"}
                  </div>
                  <div className="space-y-2">{opt("A","A")}{opt("B","B")}{opt("C","C")}{opt("D","D")}</div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Details */}
          <div className="col-span-10 lg:col-span-3 lg:sticky lg:top-4 self-start">
            <div className="rounded-xl border border-emerald-900/60 bg-gradient-to-tl from-slate-800 to-slate-5900 p-3  min-h-[72vh] flex flex-col">
              <div className="text-slate-200/90 font-semibold mb-3">Test details</div>

              <div className="space-y-2">
                <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-slate-400 mr-2">Title:</span>
                  <span className="text-emerald-300">{title}</span>
                </div>
                <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-slate-400 mr-2">Duration:</span>
                  <span className="text-emerald-300">{test?.duration ?? "—"} min</span>
                </div>
                 <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-slate-400 mr-2">Total Questions:</span>
                  <span className="text-emerald-300">{test?.totalQuestionCount ?? "—"}</span>
                </div>
                <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-slate-400 mr-2">Passing:</span>
                  <span className="text-emerald-300">{test?.passingPercentage ?? 0}%</span>
                </div>
                <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-slate-400 mr-2">Time left:</span>
                  <span className={secondsLeft != null && secondsLeft <= 60 ? "text-red-300" : "text-emerald-300"}>
                    {fmtMMSS(secondsLeft)}
                  </span>
                </div>
              </div>

               {/* result rows (after submit) */}
  {result && (
    <>
      <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
        <span className="text-slate-400 mr-2">Score:</span>
        <span className={result.status === "pass" ? "text-emerald-300" : "text-red-300"}>
          {result.scorePercentage}%
        </span>
      </div>
      <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
        <span className="text-slate-400 mr-2">Attempt:</span>
        <span className="text-emerald-300">{attemptCount}</span>
      </div>
      <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
        <span className="text-slate-400 mr-2">Status:</span>
        <span className={result.status === "pass" ? "text-emerald-300" : "text-red-300"}>
          {result.status}
        </span>
      </div>
     <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
       <span className="text-slate-400 mr-2">Time taken:</span>
       <span className="text-emerald-300">
         {fmtMMSS(Number(result.timeTakenSec ?? 0))}
       </span>
     </div>
    </>
  )}

  {/* actions */}
  <div className="mt-auto pt-6 flex justify-end">
    <Tooltip text={!allAnswered ? "Answer all questions to submit" : "Submit"}>
    <button
      type="button"
      onClick={() => onSubmit(false)}
      disabled={!allAnswered || isFrozen}
      className={`rounded-lg px-4 py-1.5 text-slate-200 border
        ${allAnswered && !isFrozen
          ? "border-emerald-700 bg-emerald-700/40 hover:bg-emerald-600/50"
          : "border-slate-700 bg-slate-700/40 cursor-not-allowed"}`}
      
    >
      Submit
    </button>
    </Tooltip>
  </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
