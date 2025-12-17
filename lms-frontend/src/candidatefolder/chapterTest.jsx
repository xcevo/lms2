// src/candidatefolder/chapterTest.jsx
import { useCallback, useEffect, useMemo,useRef, useState } from "react";
import { ChevronLeft, Shuffle } from "lucide-react";
import API_BASE_URL from "../../config";
import { toast } from "react-toastify";

/** Utility: Fisher–Yates shuffle */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}



export default function ChapterTest({ subject, chapter, onBack }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [test, setTest] = useState(null);

  // questions shown on screen (randomized subset)
  const [qList, setQList] = useState([]);
  // radio selections: { [qIndex]: 'A'|'B'|'C'|'D' }
  const [answers, setAnswers] = useState({});
  // local attempt/result state (for UI only)
  const [attemptCount, setAttemptCount] = useState(0);
  const [result, setResult] = useState(null); // { scorePercentage, status }
  const [timeTaken, setTimeTaken] = useState(null);
  const [isFrozen, setIsFrozen] = useState(false); // lock UI after submit
  const [blocked, setBlocked] = useState(null);
  

  // ---- countdown (in seconds) + guard so we auto-submit once ----
  const [secondsLeft, setSecondsLeft] = useState(null);
  const autoSubmittedRef = useRef(false);

  const formatMMSS = useCallback((secs) => {
    if (secs == null) return "—";
    const m = Math.max(0, Math.floor(secs / 60));
    const s = Math.max(0, secs % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, []);


  // ---------- fetch linked test ----------
useEffect(() => {
  const go = async () => {
    try {
      setIsFrozen(false);
      setBlocked(null);
      setLoading(true);
      setErr("");
      setTest(null);
      setQList([]);
      setAnswers({});
      setAttemptCount(0);
      setResult(null);
      autoSubmittedRef.current = false;
      setSecondsLeft(null);

      const token = localStorage.getItem("token");
      const url = `${API_BASE_URL}/api/candidate-test/subjects/${subject?._id}/chapters/${chapter?._id}/linked`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // --- handle "already passed" (409) here ---
      if (res.status === 409) {
        const dj = await res.json().catch(() => ({}));
        setErr(dj?.message || "You have already passed this test.");
        setBlocked({
          scorePercentage: dj?.scorePercentage ?? null,
          attemptCount: dj?.attemptCount ?? null,
          attemptedAt: dj?.attemptedAt ?? null,
        });
        setLoading(false);
        setIsFrozen(true);
        return;
      }

      if (!res.ok) {
        const dj = await res.json().catch(() => ({}));
        throw new Error(dj?.message || "Failed to load test.");
      }

      const data = await res.json();
      const t = data?.test || null;
      if (!t || !Array.isArray(t.questions) || t.questions.length === 0) {
        throw new Error("No questions available.");
      }
      setTest(t);
      // start/refresh countdown based on test duration (minutes)
      const mins = Number(t?.duration ?? 0);
      const totalSecs = Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : null;
      setSecondsLeft(totalSecs);

      // prepare the randomized subset right away
      const total = t.questions.length;
      const need = Math.min(t.randomizedQuestionCount || total, total);
      const withIndex = t.questions.map((q, i) => ({ ...q, __i: i }));
      const shuffled = shuffleArray(withIndex);
      setQList(shuffled.slice(0, need));
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };
  go();
}, [subject?._id, chapter?._id]);


  const title = useMemo(() => test?.title || chapter?.name || "Test", [test, chapter]);

  const handleSelect = (qIdx, optionKey) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: optionKey }));
  };

  const allAnswered = useMemo(() => {
    if (!qList.length) return false;
    for (let i = 0; i < qList.length; i++) {
      if (!answers[i]) return false;
    }
    return true;
  }, [qList, answers]);

  const reshuffle = useCallback(() => {
    if (isFrozen) return;
    if (!test?.questions?.length) return;
    const total = test.questions.length;
    const need = Math.min(test.randomizedQuestionCount || total, total);
    const withIndex = test.questions.map((q, i) => ({ ...q, __i: i }));
    const shuffled = shuffleArray(withIndex);
    setQList(shuffled.slice(0, need));
    setAnswers({});
    // keep previous attempts/result unless you want a “fresh” run:
    setResult(null);
  }, [test, isFrozen]);
  const onSubmit = useCallback(async (force = false) => {
    // manual submit तभी जब सब answered; auto-submit (force=true) partial allow
    if ((!force && !allAnswered) || !qList.length) return;

    // Build payload for backend
    const payloadAnswers = Object.entries(answers).map(([localIdx, optionKey]) => {
      const q = qList[Number(localIdx)];
      return { index: q.__i, selected: optionKey }; // <-- original index!
    });

   // compute timeTakenSec
   const durationSecs = Number(test?.duration || 0) * 60;
   let takenSec = durationSecs;                  // default for auto-submit
   if (!force) {                                 // manual submit
     const left = Number.isFinite(secondsLeft) ? Math.max(0, secondsLeft) : durationSecs;
     takenSec = Math.max(0, durationSecs - left);
   }

    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE_URL}/api/candidate-test/subjects/${subject?._id}/chapters/${chapter?._id}/submit`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testId: test?._id,
          answers: payloadAnswers,
          timeTakenSec: takenSec,
        }),
      });

      // If already passed earlier, backend 409 with locked=true
      if (res.status === 409) {
        const dj = await res.json().catch(() => ({}));
        const r = dj?.result || {};
        setResult({ scorePercentage: r.scorePercentage ?? 0, status: r.status ?? "pass" });
         setIsFrozen(true); // lock UI on already-passed
        // attempt count increment na karein kyunki store nahi hua (locked)
        return;
      }

      if (!res.ok) {
        const dj = await res.json().catch(() => ({}));
        throw new Error(dj?.message || "Submit failed");
      }

      const data = await res.json();
      const grading = data?.grading || {};

      // UI side result + attempt
      setAttemptCount((c) => c + 1);
      setResult({
        scorePercentage: Math.round((grading.scorePercentage ?? 0) * 100) / 100,
        status: grading.passed ? "pass" : "fail",
      });
      setTimeTaken(grading.timeTakenSec ?? takenSec);
      setIsFrozen(true);

    } catch (e) {
      console.error(e);
      // fallback (optional): koi message show karna ho to yahan setErr bhi kar sakte
    }
  }, [allAnswered, qList, answers, subject?._id, chapter?._id, test?._id]);


  // tick down every second; when 0 -> auto submit with whatever answered
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

  // when it hits 0 and not frozen, force submit once
  useEffect(() => {
    if (secondsLeft === 0 && !isFrozen && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      toast.error("You ran out of time"); // show timeout toast
      // force=true -> allow partial answers
      onSubmit(true);
    }
  }, [secondsLeft, isFrozen, onSubmit]);

  useEffect(() => {
    if (isFrozen) setSecondsLeft((s) => (s == null ? s : 0));
  }, [isFrozen]);

 
  if (loading) {
    return (
      <section className="px-4 sm:px-6 md:px-8">
        <div className="rounded-xl border border-emerald-800/60 bg-white/5 text-emerald-200 px-4 py-3">
          Loading test…
        </div>
      </section>
    );
  }

  if (err) {
    return (
      <section className="px-4 sm:px-6 md:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-emerald-400 font-medium text-xl">
            Test — <span className="opacity-90">{subject?.name} / {chapter?.name}</span>
          </h2>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/70 bg-gradient-to-tl from-slate-800 to-slate-5900 hover:bg-white/10 px-3 py-1.5 text-lg text-slate-200"
          >
            <ChevronLeft size={16} className="text-emerald-400" /> Back to chapters
          </button>
        </div>
        <div className="rounded-xl border border-red-700/60 bg-red-900/20 text-red-200 px-4 py-3">
  {err}
</div>

{blocked && (
  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div className="rounded-md border border-emerald-900 bg-white/10 px-3 py-2 text-sm">
      <span className="text-slate-200 mr-2">Score:</span>
      <span className="text-emerald-300">{blocked.scorePercentage}%</span>
    </div>
    <div className="rounded-md border border-emerald-900 bg-white/10 px-3 py-2 text-sm">
      <span className="text-slate-200 mr-2">Attempts:</span>
      <span className="text-emerald-300">{blocked.attemptCount}</span>
    </div>
    {/* optional: show when the last pass happened */}
    {blocked.attemptedAt && (
      <div className="rounded-md border border-emerald-900 bg-white/10 px-3 py-2 text-sm">
        <span className="text-slate-200 mr-2">Last attempt:</span>
        <span className="text-emerald-300">
          {new Date(blocked.attemptedAt).toLocaleString()}
        </span>
      </div>
    )}
  </div>
)}

      </section>
    );
  }

  return (<>
   <style>{`
    /* Premium emerald scrollbar (left questions pane only) */
    .scroll-emerald{
      scrollbar-width: thin;                        /* Firefox */
      scrollbar-color: rgba(16,185,129,.75) rgba(15,23,42,.35);
    }
    .scroll-emerald::-webkit-scrollbar{
      width: 10px;                                  /* Chromium/WebKit */
    }
    .scroll-emerald::-webkit-scrollbar-track{
      background: rgba(2,6,23,.35);                 /* slate-950-ish with opacity */
      border-radius: 12px;
    }
    .scroll-emerald::-webkit-scrollbar-thumb{
      background: linear-gradient(180deg,
        rgba(16,185,129,.75),                        /* emerald-500 */
        rgba(5,150,105,.65)                          /* emerald-600 */
      );
      border: 1px solid rgba(16,185,129,.45);
      border-radius: 12px;
    }
    .scroll-emerald::-webkit-scrollbar-thumb:hover{
      background: linear-gradient(180deg,
        rgba(16,185,129,.9),
        rgba(5,150,105,.8)
      );
    }
  `}</style>
    <section className="px-4 sm:px-6 md:px-8 ">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-emerald-400 font-medium text-xl">
          Test — <span className="opacity-90">{subject?.name} / {chapter?.name}</span>
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={reshuffle}
            disabled={isFrozen}
           className={`inline-flex items-center gap-2 rounded-lg border border-emerald-700/70 
            bg-gradient-to-tl from-slate-800 to-slate-5900 px-3 py-1.5 text-lg text-slate-200
            ${isFrozen ? "cursor-not-allowed opacity-40" : "hover:bg-white/10"}`}
            
          >
            <Shuffle size={16} className="text-emerald-400" /> Shuffle
          </button>

          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/70 bg-gradient-to-tl from-slate-800 to-slate-5900 hover:bg-white/10 px-3 py-1.5 text-lg text-slate-200"
          >
            <ChevronLeft size={16} className="text-emerald-400" /> Back to chapters
          </button>
        </div>
      </div>

      {/* Two columns: 70% questions, 30% details */}
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
            `cursor-pointer transition ${selected === key ? "ring-1 ring-emerald-500/40 bg-emerald-900/10" : "hover:bg-white/10"}` }
          ${!isFrozen && selected === key ? "" : ""}`}
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

                <div className="space-y-2">
                  {opt("A", "A")}
                  {opt("B", "B")}
                  {opt("C", "C")}
                  {opt("D", "D")}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Test details + actions */}
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
                <span className="text-slate-400 mr-2">Passing:</span>
                <span className="text-emerald-300">{test?.passingPercentage ?? 0}%</span>
              </div>
               {/* countdown */}
              <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                <span className="text-slate-400 mr-2">Time left:</span>
                <span className={secondsLeft != null && secondsLeft <= 60 ? "text-red-300" : "text-emerald-300"}>
                  {formatMMSS(secondsLeft)}
                </span>
              </div>

              {/* NEW: result rows (render only after first submit) */}
              {result && (
                <>
                  <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                    <span className="text-slate-400 mr-2">Score:</span>
                    <span className={`${result.status === "pass" ? "text-emerald-300" : "text-red-300"}`}>
                      {result.scorePercentage}%
                    </span>
                  </div>
                  <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                    <span className="text-slate-400 mr-2">Attempt:</span>
                    <span className="text-emerald-300">{attemptCount}</span>
                  </div>
                  <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
                    <span className="text-slate-400 mr-2">Status:</span>
                    <span className={`${result.status === "pass" ? "text-emerald-300" : "text-red-300"}`}>
                      {result.status}
                    </span>
                  </div>
     <div className="rounded-md border border-emerald-900/60 bg-white/5 px-3 py-2 text-sm">
     <span className="text-slate-400 mr-2">Time taken:</span>
     <span className="text-emerald-300">{formatMMSS(timeTaken)}</span>
     </div>
                </>
              )}
            </div>

            {/* actions bar */}
            <div className="mt-auto pt-6 flex justify-end gap-2">
            
              <button
                type="button"
                onClick={() => onSubmit(false)}
                disabled={!allAnswered || isFrozen}
                className={`rounded-lg px-4 py-1.5 text-slate-200 border 
                  ${allAnswered && !isFrozen
                    ? "border-emerald-700 bg-emerald-700/40 hover:bg-emerald-600/50"
                    : "border-slate-700 bg-slate-700/40 cursor-not-allowed"}`}
                title={!allAnswered ? "Answer all questions to submit" : "Submit"}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
