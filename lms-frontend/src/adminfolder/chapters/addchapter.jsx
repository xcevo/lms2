import { useMemo, useState } from "react";
import API_BASE_URL from "../../../config";
import { toast } from "react-toastify";

export default function AddChapterModal({ open, onClose, onSaved, subjectId }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pdf, setPdf] = useState(null);
  const [video, setVideo] = useState(null);
  const [busy, setBusy] = useState(false);

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Chapter name is required.");
    if (!pdf) return toast.error("PDF is required.");

    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("description", description.trim());
    fd.append("pdf", pdf);
    if (video) fd.append("video", video);

    setBusy(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(subjectId)}/chapter/create`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create chapter");
      onSaved(data.chapter);
      toast.success("Chapter created");
      onClose();
      setName("");
      setDescription("");
      setPdf(null);
      setVideo(null);
    } catch (e) {
      toast.error(e.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl rounded-lg border border-emerald-800 bg-white/5 text-slate-200 shadow-xl overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-green-400">Add Chapter</h3>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chapter 1"
                className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description…"
                rows={4}
                className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">PDF (required)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdf(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Video (optional)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideo(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
