import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiRefreshCw, FiEdit2, FiTrash2, FiArrowLeft, FiVideo,FiFile  } from "react-icons/fi";
import API_BASE_URL from "../../../config";
import Tooltip from "../../components/tooltip";
import { toast } from "react-toastify";
import AddChapterModal from "./addchapter";
import EditChapterModal from "./editchapter";
import DeleteChapterModal from "./deletechapter";
import VideoPopup from "./videopopup";
import LinkTestModal from "./linktestbutton";
import TopicButtonView from "./topicbutton";
import LinkPracticeTestModal from "./linkpracticetestbutton";


export default function ChapterButtonView({ subject, onBack }) {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [videoRow, setVideoRow] = useState(null);
  const [linkRow, setLinkRow] = useState(null);
  const [linkPracticeRow, setLinkPracticeRow] = useState(null);
  const [topicChapter, setTopicChapter] = useState(null);

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const fetchAll = async () => {
    if (!subject?._id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(subject._id)}/Allchapters`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setChapters(Array.isArray(data?.chapters) ? data.chapters : []);
    } catch {
      toast.error("Failed to fetch chapters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?._id]);

  const onAdded = (created) => setChapters((r) => [created, ...r]);
  const onEdited = (updated) =>
    setChapters((r) => r.map((x) => (x._id === updated._id ? updated : x)));

  const confirmDelete = async () => {
    if (!deleteRow?._id) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(
          subject._id
        )}/delete-chapter/${encodeURIComponent(deleteRow._id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        let j = {};
        try { j = await res.json(); } catch {}
        throw new Error(j?.message || "Delete failed");
      }
      setChapters((r) => r.filter((x) => x._id !== deleteRow._id));
      toast.success("Chapter deleted");
      setDeleteRow(null);
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const subjectId = subject?._id; // you already have subject from props

const openPdf = (chapterId) => {
  if (!subjectId || !chapterId) return;
  const url = `${API_BASE_URL}/api/admin-subject/public/${encodeURIComponent(
    subjectId
  )}/chapter/${encodeURIComponent(chapterId)}/pdf`;
  // Open in a new tab without giving it access to the opener
  window.open(url, "_blank", "noopener,noreferrer");
};

 if (topicChapter) {
   return (
     <TopicButtonView
       subjectId={subject._id}
       chapter={topicChapter}
       onBack={() => setTopicChapter(null)}
     />
   );
 }

  return (
    <section className="space-y-3">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tooltip text="Back to Subjects">
            <button
              onClick={onBack}
              className="p-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300"
            >
              <FiArrowLeft />
            </button>
          </Tooltip>
          <h2 className="text-lg font-semibold text-emerald-400">
            Chapters – <span className="text-slate-300">{subject?.name || ""}</span>
          </h2>
        </div>

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
            <FiPlus /> Add Chapter
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-lg border border-green-600/40">
        <table className="min-w-full bg-black text-slate-200">
          <thead className="bg-white/10 text-slate-400 border-b-[0.3px] border-slate-800">
            <tr className="text-left">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-center">Attachments</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={4}>
                  Loading chapters…
                </td>
              </tr>
            ) : chapters.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={4}>
                  No chapters found.
                </td>
              </tr>
            ) : (
              chapters.map((c) => (
                <tr
                  key={c._id}
                  className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{c.name}</td>
                  <td className="px-4 py-2">
                    <div className="max-w-3xl text-slate-300 text-sm">
                      {c.description || ""}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-3 text-xs">
                      <Tooltip text="Download/View pdf">
                     <button
                      type="button"
                      onClick={() => openPdf(c._id)}
                      className="p-2 rounded bg-white/5 border border-white/10 hover:bg-blue-500"
                                        >
                      <FiFile className="text-slate-100" size={16} />
                    </button>
                    </Tooltip>

              {c.videoPath ? (
                <Tooltip text="Download/View Video">
              <button
                type="button"
                onClick={() => setVideoRow(c)}
                className="p-2 rounded border bg-white/10 border-white/10 hover:bg-white/20"
                title="Play video"
              >
                <FiVideo className="text-slate-100" size={16}/>
              </button>
              </Tooltip>
            ) : (
              <span className="px-2 py-0.5 rounded border bg-transparent border-white/10 text-slate-500">
                Video
              </span>
            )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <Tooltip text="Edit chapter">
                        <button
                          className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10"
                          onClick={() => setEditRow(c)}
                        >
                          <FiEdit2 className="text-slate-100" />
                        </button>
                      </Tooltip>

                      <Tooltip text="Delete chapter">
                        <button
                          className="p-2 rounded bg-white/5 border border-white/10 hover:bg-red-700"
                          onClick={() => setDeleteRow(c)}
                        >
                          <FiTrash2 className="text-slate-100" />
                        </button>
                      </Tooltip>

                       <button
                        className="px-2.5 py-1 rounded-xl bg-slate-400 text-slate-900 hover:bg-blue-500 text-white text-xs font-medium"
                        type="button"
                        onClick={() => setLinkRow(c)}
                        >
                        Link Test
                      </button>
                      <button
                      className="px-2.5 py-1 rounded-xl bg-slate-400 text-slate-900 hover:bg-blue-500 text-white text-xs font-medium"
                      type="button"
                      onClick={() => setTopicChapter(c)}
                    >
                      Topics
                    </button>

                     <button
                      className="px-2.5 py-1 rounded-xl bg-slate-400 text-slate-900 hover:bg-blue-500 text-white text-xs font-medium"
                      type="button"
                      onClick={() => setLinkPracticeRow(c)}
                      
                    >
                      Link practice Test
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
        <AddChapterModal
          open={showAdd}
          subjectId={subject._id}
          onClose={() => setShowAdd(false)}
          onSaved={onAdded}
        />
      )}

      {editRow && (
        <EditChapterModal
          open={!!editRow}
          subjectId={subject._id}
          chapter={editRow}
          onClose={() => setEditRow(null)}
          onSaved={onEdited}
        />
      )}

      {deleteRow && (
        <DeleteChapterModal
          open={!!deleteRow}
          chapterName={deleteRow?.name}
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => (!deleting ? setDeleteRow(null) : null)}
        />
      )}
      {videoRow && (
        <VideoPopup
          open={!!videoRow}
          subjectId={subject._id}
          chapter={videoRow}
          onClose={() => setVideoRow(null)}
        />
      )}

      {linkRow && (
  <LinkTestModal
    open={!!linkRow}
    subjectId={subjectId}
    chapter={linkRow}
    onClose={() => setLinkRow(null)}
    onChanged={(newLinked) => {
      // Update the table row so UI reflects the new link immediately
      setChapters((rows) =>
        rows.map((r) =>
          r._id === linkRow._id
            ? {
                ...r,
                linkedTest: newLinked
                  ? { _id: newLinked._id, title: newLinked.title }
                  : null,
              }
            : r
        )
      );

      // Keep the modal open and also update the chapter shown inside it
      setLinkRow((prev) =>
        prev
          ? {
              ...prev,
              linkedTest: newLinked
                ? { _id: newLinked._id, title: newLinked.title }
                : null,
            }
          : prev
      );
      // NOTE: do not close the modal here
    }}
  />
)}

 {linkPracticeRow && (
   <LinkPracticeTestModal
     open={!!linkPracticeRow}
     subjectId={subjectId}
     chapter={linkPracticeRow}
     onClose={() => setLinkPracticeRow(null)}
     onChanged={(newLinked) => {
       // update table row instantly
       setChapters((rows) =>
         rows.map((r) =>
           r._id === linkPracticeRow._id
             ? {
                 ...r,
                 linkedPracticeTest: newLinked
                   ? { _id: newLinked._id, title: newLinked.title }
                   : null,
               }
             : r
         )
       );
       // keep modal state in sync
       setLinkPracticeRow((prev) =>
         prev
           ? {
               ...prev,
               linkedPracticeTest: newLinked
                 ? { _id: newLinked._id, title: newLinked.title }
                 : null,
             }
           : prev
       );
     }}
   />
 )}


    </section>
  );
}
