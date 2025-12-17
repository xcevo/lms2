import { useMemo, useState } from "react";
import API_BASE_URL from "../../config";
/**
 * PracticeTestAppear
 * - Shuffles questions once per session
 * - Shows one question at a time
 * - "Next" disabled until an option is chosen
 * - "Finish practice" always enabled
 * - On finish: shows a result card (attempted/correct/incorrect/score)
 */
export default function PracticeTestAppear({
  level = "",
  questions = [],
  onFinish, // optional: parent may still use it, but we don't rely on it
  practiceId,
  subjectId,
  chapterId,
}) {
  // One-time shuffle of the provided questions for this session
  const shuffled = useMemo(() => {
    const arr = Array.isArray(questions) ? [...questions] : [];

    const rand = (n) => {
      try {
        const u = new Uint32Array(1);
        window?.crypto?.getRandomValues?.(u);
        return Number(u[0] % n);
      } catch {
        return Math.floor(Math.random() * n);
      }
    };

    for (let i = arr.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [questions, level]);

  const total = shuffled.length;

  // Progress / selection state
  const [index, setIndex] = useState(0);                 // current question index
  const [selected, setSelected] = useState(null);        // selected option for current question
  const [choices, setChoices] = useState(() =>           // record of selections (by index) per question
    Array(total).fill(null)
  );

  // Finish/result state
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState({
    attempted: 0,
    correct: 0,
    incorrect: 0,
    percent: 0,
  });

  const q = shuffled[index] ?? {};
  const canNext = selected !== null && index < total - 1;

  const commitCurrentChoice = () => {
    // Persist the current question's selection (if any) into choices array
    if (selected === null) return;
    setChoices((prev) => {
      const next = [...prev];
      next[index] = selected;
      return next;
    });
  };

  const next = () => {
    if (!canNext) return;
    commitCurrentChoice();
    setIndex((i) => {
      const ni = i + 1;
      // restore previously chosen option (if user navigated back in future versions)
      setSelected((prev) => choices[ni]);
      return ni;
    });
    setSelected(null);
  };

  const computeAndShowResult = () => {
    // Include current selection (if not yet committed)
    const finalChoices = (() => {
      const copy = [...choices];
      if (selected !== null) copy[index] = selected;
      return copy;
    })();

    let attempted = 0;
    let correct = 0;

    for (let i = 0; i < total; i++) {
      const sel = finalChoices[i];
      if (sel === null || sel === undefined) continue;
      attempted++;

      const qi = shuffled[i] || {};
      const hasIndex = typeof qi.correctIndex === "number" && qi.correctIndex >= 0;
      const okByIndex = hasIndex && sel === qi.correctIndex;
      const okByValue =
        Array.isArray(qi.options) &&
        typeof qi.correctAnswer === "string" &&
        qi.options[sel] === qi.correctAnswer;

      if (okByIndex || okByValue) correct++;
    }

    const incorrect = Math.max(0, attempted - correct);
    const percent = attempted ? Math.round((correct / attempted) * 100) : 0;

    setResult({ attempted, correct, incorrect, percent });
    setFinished(true);
    // NEW: save practice result to backend (fire & forget)
    if (practiceId && subjectId && chapterId) {
      const token = localStorage.getItem("token") || "";
      const url = `${API_BASE_URL}/api/candidate-test/subjects/${encodeURIComponent(
        subjectId
      )}/chapters/${encodeURIComponent(chapterId)}/practice-result`;
      const payload = {
        practiceId,
        attempted,
        correct,
        scorePercent: percent,
        level,
      };
      // don't block UI; log any error
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }).catch((e) => console.error("Failed to save practice result:", e));
    }
  };

  if (finished) {
    return (
      <div className="px-6">
        <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-tl from-slate-800 to-slate-5900 shadow-[0_8px_24px_rgba(0,0,0,0.35)] p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-100 text-xl font-semibold">Your result</h3>
            <span className="text-slate-400 text-sm">
              Level: <span className="capitalize text-slate-200">{level || "-"}</span>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
            <Stat label="Attempted" value={result.attempted} />
            <Stat label="Correct" value={result.correct} />
            <Stat label="Incorrect" value={result.incorrect} />
            <Stat label="Score" value={`${result.percent}%`} />
          </div>

          {/* Optional: let parent know user finished (without closing our view). */}
          {typeof onFinish === "function" ? (
            <div className="mt-6">
              <button
                onClick={() => onFinish()}
                className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-slate-100
                           border-emerald-800/70 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      {/* question card */}
      <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-tl from-slate-800 to-slate-5900 shadow-[0_8px_24px_rgba(0,0,0,0.35)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-slate-300 text-sm">
            Level:{" "}
            <span className="text-slate-100 font-medium capitalize">
              {level}
            </span>
          </div>
          <div className="text-slate-400 text-sm">
            {index + 1} / {total}
          </div>
        </div>

        <h4 className="text-slate-200 font-semibold text-lg leading-snug">
          {q?.question || ""}
        </h4>

        {/* options */}
        <div className="mt-4 space-y-3">
          {(q?.options ?? []).map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 rounded-lg border border-slate-700/60 bg-white/5 hover:bg-white/10 transition-colors px-3 py-3 cursor-pointer ${
                selected === i ? "ring-1 ring-emerald-500/40" : ""
              }`}
            >
              <input
                type="radio"
                name={`q_${index}`}
                className="accent-emerald-500"
                checked={selected === i}
                onChange={() => setSelected(i)}
              />
              <span className="text-slate-200">{opt}</span>
            </label>
          ))}
        </div>

        {/* actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={next}
            disabled={!canNext}
            className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-slate-100
              border-emerald-800/70 bg-white/5 hover:bg-white/10
              ${!canNext ? "opacity-50 cursor-not-allowed" : "transition-colors"}`}
          >
            Next question
          </button>

          <button
            onClick={() => {
              commitCurrentChoice();
              computeAndShowResult();
            }}
            className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-slate-100
                       border-rose-800/70 bg-white/5 hover:bg-rose-700/20 transition-colors"
          >
            Finish practice
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-emerald-900/50 bg-white/5 px-4 py-3">
      <div className="text-slate-400 text-sm">{label}</div>
      <div className="text-slate-100 text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
