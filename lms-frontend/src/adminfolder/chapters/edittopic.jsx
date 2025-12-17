import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
// topicbutton.jsx jahan pada hai, wahi folder me ye file hogi,
// isliye config ka import same pattern rakha hai:
import API_BASE_URL from "../../../config";

export default function EditTopic({
  subjectId,
  chapter,     // { _id, name }
  topic,       // topic object to edit
  onUpdated,   // (updatedTopic) => void
  onClose,     // () => void
}) {
  const token = useMemo(() => localStorage.getItem("token") || "", []);

  // form state
  const [name, setName] = useState(topic?.name || "");
  const [pdfPage, setPdfPage] = useState(topic?.pdfPage ?? 1);

  // seconds (derived from HH:MM:SS inputs)
  const [startSec, setStartSec] = useState(topic?.videoStartSec ?? 0);
  const [endSec, setEndSec] = useState(topic?.videoEndSec ?? 0);

  // HH:MM:SS fields
  const [sH, setSH] = useState(0), [sM, setSM] = useState(0), [sS, setSS] = useState(0);
  const [eH, setEH] = useState(0), [eM, setEM] = useState(0), [eS, setES] = useState(0);

  const [busy, setBusy] = useState(false);

  const clamp = (v, min, max) =>
    Math.min(max, Math.max(min, Number.isFinite(+v) ? +v : 0));
  const toSec = (h, m, s) => (clamp(h, 0, 10 ** 9) * 3600) + (clamp(m, 0, 59) * 60) + clamp(s, 0, 59);
  const fromSec = (sec = 0) => {
    const s = Math.max(0, parseInt(sec, 10) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return [h, m, ss];
  };

  // end ko hamesha startSec + 1 se bada rakhna
const setEndHMS = (h, m, s) => {
  let sec = toSec(h, m, s);
  if (sec <= startSec) sec = startSec + 1;
  const [H, M, S] = fromSec(sec);
  setEH(H); setEM(M); setES(S);
  setEndSec(sec);
};


  // prefill HH:MM:SS from existing seconds
  useEffect(() => {
    const [h1, m1, s1] = fromSec(topic?.videoStartSec ?? 0);
    const [h2, m2, s2] = fromSec(topic?.videoEndSec ?? 0);
    setSH(h1); setSM(m1); setSS(s1);
    setEH(h2); setEM(m2); setES(s2);
    setStartSec(topic?.videoStartSec ?? 0);
    setEndSec(topic?.videoEndSec ?? 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?._id]);

  // keep seconds in sync with HH:MM:SS inputs
  useEffect(() => { setStartSec(toSec(sH, sM, sS)); }, [sH, sM, sS]);
  useEffect(() => { setEndSec(toSec(eH, eM, eS)); }, [eH, eM, eS]);

  // NEW
useEffect(() => {
  if (endSec <= startSec) {
    const next = startSec + 1;
    const [H, M, S] = fromSec(next);
    setEH(H); setEM(M); setES(S);
    setEndSec(next);
  }
}, [startSec]);  // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e?.preventDefault?.();

    if (!name.trim()) return toast.warn("Topic name is required");
   if (!(endSec > startSec))
   return toast.warn("Video end must be greater than start");

    setBusy(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(subjectId)}` +
        `/chapter/${encodeURIComponent(chapter._id)}` +
        `/update-topic/${encodeURIComponent(topic._id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // NOTE: backend ko seconds hi milte rahenge
          body: JSON.stringify({
            name: name.trim(),
            pdfPage: Number(pdfPage) || 1,
            videoStartSec: Number(startSec) || 0,
            videoEndSec: Number(endSec) || 0,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update topic");

      toast.success("Topic updated");
      onUpdated?.(data.topic);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Failed to update topic");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-emerald-800 bg-white/5 p-5 text-slate-200">
        <h3 className="text-green-400 font-semibold mb-4">
          Edit Topic — {chapter?.name}
        </h3>

        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-sm text-slate-400">Topic name</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter topic name"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-slate-400">PDF page</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                value={pdfPage}
                onChange={(e) => setPdfPage(e.target.value)}
              />
            </div>

            {/* Start (HH:MM:SS) */}
            <div>
              <label className="text-sm text-slate-400">Video start (HH:MM:SS)</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <input type="number" min={0} placeholder="HH"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  value={sH} onChange={(e) => setSH(Math.max(0, parseInt(e.target.value || 0, 10)))} />
                <input type="number" min={0} max={59} placeholder="MM"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  value={sM} onChange={(e) => setSM(clamp(e.target.value, 0, 59))} />
                <input type="number" min={0} max={59} placeholder="SS"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  value={sS} onChange={(e) => setSS(clamp(e.target.value, 0, 59))} />
              </div>
              <p className="mt-1 text-xs text-slate-400">= {startSec} sec</p>
            </div>

            {/* End (HH:MM:SS) */}
            <div>
              <label className="text-sm text-slate-400">Video end (HH:MM:SS)</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <input type="number" min={0} placeholder="HH"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  value={eH} onChange={(e) => setEndHMS(Math.max(0, parseInt(e.target.value || 0, 10)), eM, eS)} />
                <input type="number" min={0} max={59} placeholder="MM"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  value={eM} onChange={(e) => setEndHMS(eH, clamp(e.target.value, 0, 59), eS)} />
                <input type="number" min={0} max={59} placeholder="SS"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  value={eS} onChange={(e) => setEndHMS(eH, eM, clamp(e.target.value, 0, 59))} />
              </div>
              <p className="mt-1 text-xs text-slate-400">= {endSec} sec</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20"
              onClick={() => !busy && onClose?.()}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
