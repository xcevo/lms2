import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiPlus,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import API_BASE_URL from "../../../config";
import Tooltip from "../../components/tooltip";
import { toast } from "react-toastify";
import AddTopicBtn from "./addtopicbtn";
import EditTopic from "./edittopic";
import DeleteTopicModal from "./deleteTopic";

// seconds -> "HH:MM:SS"
const secToHMS = (total = 0) => {
  const s = Math.max(0, parseInt(total, 10) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
};




/**
 * Props:
 * - subjectId: string
 * - chapter: { _id, name, ... }
 * - onBack: () => void
 */
export default function TopicButtonView({ subjectId, chapter, onBack }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // topic object or null
  const [deleting, setDeleting] = useState(null); // topic object or null
  const [delBusy, setDelBusy] = useState(false);


  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const fetchTopics = async () => {
    if (!subjectId || !chapter?._id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(
          subjectId
        )}/chapter/${encodeURIComponent(chapter._id)}/alltopics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setTopics(Array.isArray(data?.topics) ? data.topics : []);
    } catch {
      toast.error("Failed to fetch topics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, chapter?._id]);

  

  return (
    <section className="space-y-3">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tooltip text="Back to Chapters">
            <button
              onClick={onBack}
              className="p-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300"
            >
              <FiArrowLeft />
            </button>
          </Tooltip>
          <h2 className="text-lg font-semibold text-green-400">
            Topics — <span className="text-slate-300">{chapter?.name || ""}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip text="Refresh list">
            <button
              onClick={fetchTopics}
              className="p-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300"
            >
              <FiRefreshCw />
            </button>
          </Tooltip>

        <AddTopicBtn
        subjectId={subjectId}
        chapter={chapter}
        onCreated={(topic) => setTopics((r) => [topic, ...r])}
        />

        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-lg border border-green-600/40">
        <table className="min-w-full bg-black text-slate-200">
          <thead className="bg-white/10 text-slate-400 border-b-[0.3px] border-slate-800">
            <tr className="text-left">
              <th className="px-4 py-2">Topic name</th>
              <th className="px-4 py-2 text-center">PDF page</th>
              <th className="px-4 py-2 text-center">Video (start–end)</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={4}>
                  Loading topics…
                </td>
              </tr>
            ) : topics.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={4}>
                  No topics found.
                </td>
              </tr>
            ) : (
              topics.map((t) => (
                <tr
                  key={t._id}
                  className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {t.name}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                    {t.pdfPage}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                    {secToHMS(t.videoStartSec)} – {secToHMS(t.videoEndSec)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <Tooltip text="Edit topic">
                        <button
                          onClick={() => setEditing(t)}
                          className="p-2 rounded bg-white/5 border border-white/10 hover:bg-blue-500"
                        >
                          <FiEdit2 className="text-slate-100" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete topic">
                        <button
                          onClick={() => setDeleting(t)}
                          className="p-2 rounded bg-white/5 border border-white/10 hover:bg-red-600"
                        >
                          <FiTrash2 className="text-slate-100" size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {editing && (
        <EditTopic
          subjectId={subjectId}
          chapter={chapter}
          topic={editing}
          onUpdated={(upd) => {
            // list me inplace update
            setTopics((arr) => arr.map((x) => (String(x._id) === String(upd._id) ? upd : x)));
          }}
          onClose={() => setEditing(null)}
        />
      )}

        {/* Delete confirmation modal */}
        {deleting && (
          <DeleteTopicModal
            open={!!deleting}
            topicName={deleting?.name}
            busy={delBusy}
            onClose={() => !delBusy && setDeleting(null)}
            onConfirm={async () => {
              setDelBusy(true);
              try {
                const res = await fetch(
                  `${API_BASE_URL}/api/admin-subject/${encodeURIComponent(subjectId)}` +
                  `/chapter/${encodeURIComponent(chapter._id)}` +
                  `/delete-topic/${encodeURIComponent(deleting._id)}`,
                  {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data?.message || "Failed to delete topic");
                // remove from list
                setTopics((arr) => arr.filter((x) => String(x._id) !== String(deleting._id)));
                toast.success("Topic deleted");
                setDeleting(null);
              } catch (err) {
                toast.error(err.message || "Failed to delete topic");
              } finally {
                setDelBusy(false);
              }
            }}
          />
        )}

      </div>      
    </section>
  );
}
