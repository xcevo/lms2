import { useEffect, useMemo, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../config";

/**
 * Props:
 * - subjectId: string
 * - chapter: { _id, name }
 * - onCreated?: (topic) => void
 */
export default function AddTopicBtn({ subjectId, chapter, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pdfPage, setPdfPage] = useState(1);

  // internal seconds state (payload exactly same rahega)
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);

  // NEW: HH:MM:SS controls (UI-only). Inhi se 'start' / 'end' derive honge.
  const [sH, setSH] = useState(0);
  const [sM, setSM] = useState(0);
  const [sS, setSS] = useState(0);
  const [eH, setEH] = useState(0);
  const [eM, setEM] = useState(0);
  const [eS, setES] = useState(0);
  // existing helpers ke saath add:
const fromSec = (sec = 0) => {
  const s = Math.max(0, parseInt(sec, 10) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [h, m, ss];
};

// end ko hamesha start + 1 se bada rakhne ke liye
const setEndHMS = (h, m, s) => {
  let sec = toSec(h, m, s);
  if (sec <= start) sec = start + 1;      // << hard guard
  const [H, M, S] = fromSec(sec);
  setEH(H); setEM(M); setES(S);
  setEnd(sec);
};


  const [busy, setBusy] = useState(false);
  const token = useMemo(() => localStorage.getItem("token") || "", []);

  // helpers
  const clamp = (v, min, max) => Math.min(max, Math.max(min, Number.isFinite(+v) ? +v : 0));
  const toSec = (h, m, s) => (clamp(h, 0, 10 ** 9) * 3600) + (clamp(m, 0, 59) * 60) + clamp(s, 0, 59);

  // HH:MM:SS -> seconds (reactive)
  useEffect(() => { setStart(toSec(sH, sM, sS)); }, [sH, sM, sS]);
  useEffect(() => { setEnd(toSec(eH, eM, eS)); }, [eH, eM, eS]);

  // NEW: start badalne par end ko snap karao
useEffect(() => {
  if (end <= start) {
    const next = start + 1;
    const [H, M, S] = fromSec(next);
    setEH(H); setEM(M); setES(S);
    setEnd(next);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [start]);

  const resetForm = () => {
    setName("");
    setPdfPage(1);
    setStart(0);
    setEnd(0);
    setSH(0); setSM(0); setSS(0);
    setEH(0); setEM(0); setES(0);
  };

  const save = async (e) => {
    e?.preventDefault?.();

    if (!name.trim()) {
      toast.warn("Topic name is required");
      return;
    }
 // strict: end must be strictly greater than start
 if (!(end > start)) {
   toast.warn("Video end must be greater than start");
   return;
 }

    setBusy(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(
          subjectId
        )}/chapter/${encodeURIComponent(chapter._id)}/topic`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // NOTE: backend ko same payload milta rahega (seconds)
          body: JSON.stringify({
            name: name.trim(),
            pdfPage: Number(pdfPage) || 1,
            videoStartSec: Number(start) || 0,
            videoEndSec: Number(end) || 0,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create topic");

      onCreated?.(data.topic);
      toast.success("Topic created");

      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err.message || "Failed to create topic");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* same button look & feel */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-200 font-medium"
      >
        <FiPlus /> Add Topic
      </button>

      {/* same modal look & feel */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-emerald-800 bg-white/5 p-5 text-slate-200">
            <h3 className="text-green-400 font-semibold mb-4">
              Add Topic — {chapter?.name}
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
                {/* PDF page (unchanged) */}
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

                {/* Video start HH:MM:SS */}
                <div>
                  <label className="text-sm text-slate-400">
                    Video start (HH:MM:SS)
                  </label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="HH"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                      value={sH}
                      onChange={(e) => setSH(Math.max(0, parseInt(e.target.value || 0, 10)))}
                    />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="MM"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                      value={sM}
                      onChange={(e) => setSM(clamp(e.target.value, 0, 59))}
                    />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="SS"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                      value={sS}
                      onChange={(e) => setSS(clamp(e.target.value, 0, 59))}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">= {start} sec</p>
                </div>

                {/* Video end HH:MM:SS */}
                <div>
                  <label className="text-sm text-slate-400">
                    Video end (HH:MM:SS)
                  </label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="HH"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                      value={eH}
                      onChange={(e) => setEndHMS(Math.max(0, parseInt(e.target.value || 0, 10)), eM, eS)} />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="MM"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                      value={eM}
                      onChange={(e) => setEndHMS(eH, clamp(e.target.value, 0, 59), eS)} 
                    />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="SS"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
                      value={eS}
                      onChange={(e) => setEndHMS(eH, eM, clamp(e.target.value, 0, 59))}/>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">= {end} sec</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20"
                  onClick={() => !busy && (setOpen(false), resetForm())}
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
      )}
    </>
  );
}
