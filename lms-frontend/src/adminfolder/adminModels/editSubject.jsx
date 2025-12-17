import { useEffect, useState } from "react";
import API_BASE_URL from "../../../config";

export default function EditSubjectModal({ open, subject, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");

  useEffect(() => {
    if (subject) {
      setName(subject.name || "");
      setDesc(subject.description || "");
      setCat(subject.category || "");
    }
  }, [subject]);

  if (!open || !subject) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    const d = desc.trim();
    const c = cat.trim();
    if (!n || !d || !c) {
      alert("All fields are required.");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/update/${encodeURIComponent(subject._id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ name: n, description: d, category: c }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update subject");
      onSaved?.(data.subject);
      onClose?.();
    } catch (err) {
      alert(err.message || "Failed to update subject");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl rounded-lg border border-emerald-700 bg-white/5 p-5 text-slate-200 shadow-xl">
        <h3 className="text-lg font-semibold text-green-400 mb-4">Edit Subject</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Category</label>
            <input
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-sm rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2 py-1 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
