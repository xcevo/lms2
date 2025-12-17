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
 *  - chapter: {_id, name, linkedTest?}
 *  - onChanged: fn(linked|null)  // tell parent the new linked test ({_id,title}) or null after unlink
 */
export default function LinkTestModal({ open, onClose, subjectId, chapter, onChanged }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // track which test is currently linked (accepts string id or {_id})
  const initialLinked =
    (chapter?.linkedTest && (chapter.linkedTest._id || chapter.linkedTest)) || null;
  const [linkedId, setLinkedId] = useState(initialLinked);

  const token = useMemo(() => localStorage.getItem("token") || "", []);

useEffect(() => {
  if (!open) return;
  (async () => {
    setLoading(true);
    try {
      // request JSON and bypass cache
      let res = await fetch(`${API_BASE_URL}/api/admin-test/alltests`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });

      // in case a proxy hands back 304 with no body, retry with a cache-buster
      if (res.status === 304) {
        res = await fetch(`${API_BASE_URL}/api/admin-test/alltests?ts=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
      }

      const data = await res.json().catch(() => ({}));

      // accept multiple shapes: array OR wrapped
      const list =
        Array.isArray(data) ? data :
        Array.isArray(data?.tests) ? data.tests :
        Array.isArray(data?.allTests) ? data.allTests :
        Array.isArray(data?.data) ? data.data :
        [];

      setTests(list);
    } catch {
      toast.error("Failed to load tests.");
    } finally {
      setLoading(false);
    }
  })();
}, [open, token, API_BASE_URL]);


  const link = async (test) => {
    if (!subjectId || !chapter?._id) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(subjectId)}/chapter/${encodeURIComponent(
          chapter._id
        )}/link-test`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ testId: test._id }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Link failed");
      }
      setLinkedId(test._id);
      toast.success("Test linked to chapter");
      onChanged?.({ _id: test._id, title: test.title || test.name });
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
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(subjectId)}/chapter/${encodeURIComponent(
          chapter._id
        )}/unlink-test`,
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
      {/* dim background (matches your other modals) */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />

      {/* modal card */}
      <div className="fixed z-50 inset-0 flex items-start justify-center pt-24">
        <div className="w-full max-w-2xl rounded-xl border border-emerald-800 bg-white/5 shadow-xl">
          {/* header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <h3 className="text-emerald-400 font-semibold">
              Link a Test — <span className="text-slate-300">{chapter?.name}</span>
            </h3>
            <Tooltip text="Close">
            <button
              onClick={onClose}
              className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300"
               >
              <FiX size={14}/>
            </button>
            </Tooltip>
          </div>

          {/* body */}
          <div className="p-5 space-y-3">
            <div className="text-sm text-slate-400">
              Current:{" "}
              <span className="text-slate-200 font-medium">
                {linkedId
                  ? tests.find((t) => t._id === linkedId)?.title ||
                    tests.find((t) => t._id === linkedId)?.name ||
                    "Linked"
                  : "No test linked"}
              </span>
            </div>

            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="min-w-full bg-black">
                <thead className="bg-white/10 text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Test name</th>
                    <th className="px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-400" colSpan={2}>
                        Loading tests…
                      </td>
                    </tr>
                  ) : tests.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-400" colSpan={2}>
                        No tests found.
                      </td>
                    </tr>
                  ) : (
                    tests.map((t) => {
                      const isLinkedToThis = linkedId === t._id;
                      const someLinked = !!linkedId && !isLinkedToThis;

                      return (
                        <tr
                          key={t._id}
                          className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <td className="px-4 py-2 text-sm text-emerald-400">
                            {t.title || t.name || "Untitled"}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={saving || someLinked || isLinkedToThis}
                                onClick={() => link(t)}
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
