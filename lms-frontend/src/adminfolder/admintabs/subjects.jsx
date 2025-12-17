import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiRefreshCw, FiEdit2, FiTrash2 } from "react-icons/fi";
import AddSubjectModal from "../adminModels/addSubject";
import EditSubjectModal from "../adminModels/editSubject";
import DeleteSubjectModal from "../adminModels/deleteSubpop";
import API_BASE_URL from "../../../config";
import Tooltip from "../../components/tooltip";
import { toast } from "react-toastify";
import ChapterButtonView from "../chapters/chapterbutton";
import SubjectTestLinkModal from "../adminModels/subjectTestLink";



export default function SubjectsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // NEW: delete modal state
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [chapSubject, setChapSubject] = useState(null);
  const [linkSubject, setLinkSubject] = useState(null);



  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin-subject/Allsubjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRows(Array.isArray(data?.subjects) ? data.subjects : []);
    } catch (e) {
      toast.error("Failed to fetch subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAdded = (created) => setRows((r) => [created, ...r]);
  const onEdited = (updated) =>
    setRows((r) => r.map((x) => (x._id === updated._id ? updated : x)));

  // NEW: confirm delete via API
  const confirmDelete = async () => {
    if (!deleteRow?._id) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/delete/${encodeURIComponent(
          deleteRow._id
        )}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        let j = {};
        try {
          j = await res.json();
        } catch {}
        throw new Error(j?.message || "Delete failed");
      }

      setRows((r) => r.filter((x) => x._id !== deleteRow._id));
      toast.success("Subject deleted");
      setDeleteRow(null);
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
      chapSubject ? (
    <ChapterButtonView
      subject={chapSubject}
      onBack={() => setChapSubject(null)}
    />
  ) : (
    <section className="space-y-3">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-emerald-400">Subjects</h2>

        <div className="flex items-center gap-2">
          <Tooltip text="Refresh list">
            <button
              onClick={fetchAll}
              className="p-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300"
            >
              <FiRefreshCw />
            </button>
          </Tooltip>

          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-200 font-medium"
          >
            <FiPlus /> Add Subject
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-lg border border-green-600/40">
        <table className="min-w-full bg-black text-slate-200">
          <thead className="bg-white/10 text-slate-400 border-b-[0.3px] border-slate-800">
            <tr className="text-left">
              <th className="px-4 py-2">Subject Name</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={4}>
                  Loading subjects…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={4}>
                  No subjects found.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr
                  key={s._id}
                  className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{s.name}</td>
                  <td className="px-4 py-2">
                    <div className="max-w-3xl text-slate-300 text-sm">
                      {s.description}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {s.category}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                        <Tooltip text="Add/Edit chapters">
                      <button
                        className="px-2.5 py-1 rounded-xl bg-slate-400 text-slate-900 hover:bg-blue-500 text-white text-xs font-medium"
                        type="button"
                        onClick={() => setChapSubject(s)}
                      >
                        Chapters
                      </button>
                      </Tooltip>

                      <Tooltip text="Edit subject">
                        <button
                          className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10"
                          onClick={() => setEditRow(s)}
                        >
                          <FiEdit2 className="text-slate-100" />
                        </button>
                      </Tooltip>

                      <Tooltip text="Delete subject">
                        <button
                          className="p-2 rounded bg-white/5 border border-white/10 hover:bg-red-700"
                          onClick={() => setDeleteRow(s)} // open modal
                        >
                          <FiTrash2 className="text-slate-100" />
                        </button>
                      </Tooltip>
                       <button
                        className="px-2.5 py-1 rounded-xl bg-slate-400 text-slate-900 hover:bg-blue-500 text-white text-xs font-medium"
                        type="button"
                        onClick={() => setLinkSubject(s)} 
                      >
                        Link Test
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* modals */}
      {showAdd && (
        <AddSubjectModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={onAdded}
        />
      )}
      {editRow && (
        <EditSubjectModal
          open={!!editRow}
          subject={editRow}
          onClose={() => setEditRow(null)}
          onSaved={onEdited}
        />
      )}
      {deleteRow && (
        <DeleteSubjectModal
          open={!!deleteRow}
          subjectName={deleteRow?.name}
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => (!deleting ? setDeleteRow(null) : null)}
        />
      )}

      {linkSubject && (
      <SubjectTestLinkModal
        open={!!linkSubject}
        subject={linkSubject}
        onClose={() => setLinkSubject(null)}
        onChanged={(evt) => {
          // optional: table row ko live update karna ho to yahan karein
          if (!evt?.all) return;
          setRows((arr) =>
            arr.map((x) =>
              x._id === linkSubject._id
                ? { ...x, linkedSubjectTests: evt.all.map((y) => ({ subjectTestId: y._id, title: y.title })) }
                : x
            )
          );
        }}
      />
    )}

    </section>
  )
  );
}
