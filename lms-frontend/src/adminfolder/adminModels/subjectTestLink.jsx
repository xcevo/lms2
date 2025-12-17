import { useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import Tooltip from "../../components/tooltip";
import API_BASE_URL from "../../../config";
import { toast } from "react-toastify";

const ENDPOINT = `${API_BASE_URL}/api/admin/subject-test`;

export default function SubjectTestLinkModal({ open, onClose, subject, onChanged }) {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);               // subject tests list
  const [busy, setBusy] = useState({});               // { [id]: 'link' | 'unlink' }
  const [linkedSet, setLinkedSet] = useState(new Set());

  // when subject changes, seed linked set
  useEffect(() => {
    const initial = new Set(
      (subject?.linkedSubjectTests || []).map((x) => String(x.subjectTestId || x._id))
    );
    setLinkedSet(initial);
  }, [subject]);

  // fetch all subject tests
  const fetchAll = async () => {
    setLoading(true);
    try {
      let res = await fetch(`${ENDPOINT}/allsubtests`, {
        headers: { ...authHeaders, Accept: "application/json" },
        cache: "no-store",
      });
      if (res.status === 304) {
        res = await fetch(`${ENDPOINT}/allsubtests?ts=${Date.now()}`, {
          headers: { ...authHeaders, Accept: "application/json" },
          cache: "no-store",
        });
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `Failed to load subject tests (HTTP ${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data :
                   Array.isArray(data?.tests) ? data.tests :
                   [];
      setRows(list);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to load subject tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) fetchAll(); /* eslint-disable-next-line */ }, [open]);

  const setRowBusy = (id, val) => setBusy((b) => ({ ...b, [id]: val }));
  const clearRowBusy = (id) => setBusy((b) => { const c = { ...b }; delete c[id]; return c; });

  const handleLink = async (test) => {
    const id = String(test._id);
    if (linkedSet.has(id)) return;
    setRowBusy(id, "link");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(subject._id)}/link-subject-tests`,
        {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ subjectTestIds: [id] }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Link failed");

      const next = new Set(linkedSet);
      next.add(id);
      setLinkedSet(next);
      toast.success(`Linked: ${test.title || "Subject Test"}`);

      // notify parent (optional)
      onChanged?.({
        type: "linked",
        test: { _id: id, title: test.title || "" },
        all: j?.linkedSubjectTests || null,
      });
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Link failed");
    } finally {
      clearRowBusy(id);
    }
  };

  const handleUnlink = async (test) => {
    const id = String(test._id);
    if (!linkedSet.has(id)) return;
    setRowBusy(id, "unlink");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(subject._id)}/unlink-subject-test`,
        {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ subjectTestId: id }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Unlink failed");

      const next = new Set(linkedSet);
      next.delete(id);
      setLinkedSet(next);
      toast.success(`Unlinked: ${test.title || "Subject Test"}`);

      onChanged?.({
        type: "unlinked",
        test: { _id: id, title: test.title || "" },
        all: j?.linkedSubjectTests || null,
      });
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Unlink failed");
    } finally {
      clearRowBusy(id);
    }
  };

  // Close on Esc
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-lg flex items-start justify-center p-24">
      <div className="relative w-full max-w-4xl rounded-xl border border-emerald-900 bg-white/5 shadow-[0_15px_40px_rgba(0,0,0,.55)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-lg font-semibold text-emerald-400">
            Link Subject Tests — <span className="text-slate-200">{subject?.name || ""}</span>
          </h3>
          <Tooltip text="Close">
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-red-700 text-slate-300"
            aria-label="Close"
            
          >
            <FiX size={14} />
          </button>
          </Tooltip>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Current summary */}
          <div className="mb-3 text-sm text-slate-300">
            Current linked:{" "}
            {Array.from(linkedSet).length ? (
              <span className="text-emerald-300">
                {Array.from(linkedSet).length} test(s)
              </span>
            ) : (
              <span className="text-slate-400">none</span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-emerald-900">
            <table className="w-full text-sm text-slate-200">
              <thead className="bg-white/10 text-slate-400 border-b-[0.3px] border-slate-800">
                <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
                  <th>Test name</th>
                  <th className="text-center">Duration</th>
                  <th className="text-center">Total Qs</th>
                  <th className="text-center">Passing %</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      Loading tests…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No subject tests found.
                    </td>
                  </tr>
                ) : (
                  rows.map((t) => {
                    const id = String(t._id);
                    const isLinked = linkedSet.has(id);
                    const isBusy = !!busy[id];
                    return (
                      <tr
                        key={id}
                        className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <td className="px-4 py-2 font-medium text-emerald-400">
                          {t.title}
                        </td>
                        <td className="px-4 py-2 text-center">{t.duration}</td>
                        <td className="px-4 py-2 text-center">{t.totalQuestionCount}</td>
                        <td className="px-4 py-2 text-center">{t.passingPercentage}%</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <Tooltip text="Link this test to the subject">
                              <button
                                className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-60"
                                onClick={() => handleLink(t)}
                                disabled={isLinked || isBusy}
                              >
                                {isBusy === "link" ? "Linking…" : "Link"}
                              </button>
                            </Tooltip>
                            <Tooltip text="Unlink from the subject">
                              <button
                                className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-60"
                                onClick={() => handleUnlink(t)}
                                disabled={!isLinked || isBusy}
                              >
                                {isBusy === "unlink" ? "Unlinking…" : "Unlink"}
                              </button>
                            </Tooltip>
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
  );
}
