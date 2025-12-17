import { useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import API_BASE_URL from "../../../config";
import { toast } from "react-toastify";
import Tooltip from "../../components/tooltip";

/**
 * Props:
 *  - open: boolean
 *  - onClose: fn()
 *  - subjectId: string
 *  - chapter: {_id, name, linkedPracticeTest?}
 *  - onChanged: fn(linked|null)  // tells parent the new linked practice ({_id,title}) or null after unlink
 */
export default function LinkPracticeTestModal({
  open,
  onClose,
  subjectId,
  chapter,
  onChanged,
}) {
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialLinked =
    (chapter?.linkedPracticeTest &&
      (chapter.linkedPracticeTest._id || chapter.linkedPracticeTest)) ||
    null;
  const [linkedId, setLinkedId] = useState(initialLinked);

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  // Load all uploaded practice tests (admin)
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        let res = await fetch(`${API_BASE_URL}/api/admin-practice/all`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });

        // in case of a 304 with empty body, do a cache-busted fetch
        if (res.status === 304) {
          res = await fetch(
            `${API_BASE_URL}/api/admin-practice/all?ts=${Date.now()}`,
            {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
              cache: "no-store",
            }
          );
        }

        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.practices)
          ? data.practices
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setPractices(list);
      } catch {
        toast.error("Failed to load practice tests.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const link = async (p) => {
    if (!subjectId || !chapter?._id) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(
          subjectId
        )}/chapter/${encodeURIComponent(chapter._id)}/link-practice`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ practiceId: p._id }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Link failed");
      }
      setLinkedId(p._id);
      toast.success("Practice test linked to chapter");
      onChanged?.({ _id: p._id, title: p.title || p.name });
    } catch (e) {
      toast.error(e.message || "Unable to link");
    } finally {
      setSaving(false);
    }
  };

  const unlink = async () => {
    if (!subjectId || !chapter?._id) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(
          subjectId
        )}/chapter/${encodeURIComponent(chapter._id)}/unlink-practice`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Unlink failed");
      }
      setLinkedId(null);
      toast.success("Unlinked");
      onChanged?.(null);
    } catch (e) {
      toast.error(e.message || "Unable to unlink");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
      <div className="fixed z-50 inset-0 flex items-start justify-center pt-24">
        <div className="w-full max-w-2xl rounded-xl border border-emerald-800 bg-white/5 shadow-xl">
          {/* header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <h3 className="text-green-400 font-semibold">
              Link a Practice Test —{" "}
              <span className="text-slate-300">{chapter?.name}</span>
            </h3>
            <Tooltip text="Close">
              <button
                onClick={onClose}
                className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300"
              >
                <FiX size={14} />
              </button>
            </Tooltip>
          </div>

          {/* body */}
          <div className="p-5 space-y-3">
            <div className="text-sm text-slate-400">
              Current:{" "}
              <span className="text-slate-200 font-medium">
                {linkedId
                  ? practices.find((t) => t._id === linkedId)?.title ||
                    practices.find((t) => t._id === linkedId)?.name ||
                    "Linked"
                  : "No practice test linked"}
              </span>
            </div>

            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="min-w-full bg-black">
                <thead className="bg-white/10 text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Practice name</th>
                    <th className="px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-400" colSpan={2}>
                        Loading practice tests…
                      </td>
                    </tr>
                  ) : practices.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-400" colSpan={2}>
                        No practice tests found.
                      </td>
                    </tr>
                  ) : (
                    practices.map((p) => {
                      const isLinkedToThis = linkedId === p._id;
                      const someLinked = !!linkedId && !isLinkedToThis;

                      return (
                        <tr
                          key={p._id}
                          className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <td className="px-4 py-2 text-sm">
                            {p.title || p.name || "Untitled"}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={saving || someLinked || isLinkedToThis}
                                onClick={() => link(p)}
                              >
                                Link
                              </button>
                              <button
                                className="px-2.5 py-1 rounded-xl bg-red-700 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={saving || !isLinkedToThis}
                                onClick={unlink}
                              >
                                Unlink
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
