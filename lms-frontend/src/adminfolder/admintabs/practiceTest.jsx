// src/adminfolder/admintabs/practiceTest.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { FiDownload, FiEye, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { FaUpload } from "react-icons/fa";
import Tooltip from "../../components/tooltip";
import PracticeTestPreview from "../adminModels/practicetestpreview"; // reuse preview modal (title + questions)
import API_BASE_URL from "../../../config";

// Backend endpoints (already tested in Postman)
const ENDPOINT = `${API_BASE_URL}/api/admin-practice`;

export default function PracticeTest() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { title, questions: [...] }

  const fileInputRef = useRef(null);
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    setLoading(true);
    try {
      // force fresh data (avoid any proxy 304)
      let res = await fetch(`${ENDPOINT}/all`, {
        headers: { ...authHeaders, Accept: "application/json" },
        cache: "no-store",
      });
      if (res.status === 304) {
        res = await fetch(`${ENDPOINT}/all?ts=${Date.now()}`, {
          headers: { ...authHeaders, Accept: "application/json" },
          cache: "no-store",
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed to load practices (HTTP ${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data :
                   Array.isArray(data?.practices) ? data.practices :
                   [];
      setRows(list);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load practice tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const onChooseFile = (e) => setFile(e.target.files?.[0] ?? null);

  const uploadPractice = async () => {
    if (!file) return alert("Please choose an .xlsx file first.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${ENDPOINT}/upload`, {
        method: "POST",
        headers: authHeaders,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");
      await fetchAll();
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      console.error(e);
      alert(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openPreview = async (row) => {
    try {
      const res = await fetch(`${ENDPOINT}/preview/${encodeURIComponent(row._id)}`, {
        headers: { ...authHeaders, Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Preview failed");
      // backend returns { title, category, totalQuestionCount, questions }
      setPreviewData({ title: data.title, questions: data.questions || [] });
      setPreviewOpen(true);
    } catch (e) {
      console.error(e);
      alert(e.message || "Preview failed");
    }
  };

  const downloadFile = async (row) => {
    try {
      const res = await fetch(`${ENDPOINT}/download/${encodeURIComponent(row._id)}`, {
        headers: authHeaders,
        cache: "no-store",
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      // best-effort filename
      const cd = res.headers.get("content-disposition") || "";
      const nameMatch = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      const safe = (nameMatch && nameMatch[1].replace(/['"]/g, "")) || `${row.title}.xlsx`;
      a.href = url;
      a.download = safe;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e.message || "Download failed");
    }
  };

  const deleteOne = async (row) => {
    if (!confirm(`Delete practice "${row.title}"?`)) return;
    try {
      const res = await fetch(`${ENDPOINT}/delete/${encodeURIComponent(row._id)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      setRows((arr) => arr.filter((x) => x._id !== row._id));
    } catch (e) {
      console.error(e);
      alert(e.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar — matches Tests tab styling */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onChooseFile}
            className="hidden"
            id="practiceFileInput"
          />
          <label
            htmlFor="practiceFileInput"
            className="px-2 py-1 rounded-md bg-white/5 border border-slate-600 text-slate-200 text-sm cursor-pointer hover:bg-white/20"
          >
            Choose File
          </label>

          <button
            onClick={uploadPractice}
            disabled={!file || uploading}
            className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-sky-500 text-sm flex items-center gap-2 disabled:opacity-60"
          >
            <FaUpload size={16} />
            Upload New Practice
          </button>

          {file && (
            <span className="text-sm text-slate-400">
              Selected: <span className="text-slate-200">{file.name}</span>
            </span>
          )}
        </div>

        <Tooltip text="Refresh list">
          <button
            onClick={fetchAll}
            className="p-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <FiRefreshCw className="text-white" />
          </button>
        </Tooltip>
      </div>

      {/* Table — aligned with theme */}
      <div className="overflow-hidden rounded-lg border border-emerald-900">
        <table className="w-full text-sm text-slate-200">
          <thead className="bg-white/10 text-slate-400 border-b-[0.3px] border-slate-800">
            <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
              <th>PRACTICE NAME</th>
              <th className="text-center">Total Questions</th>
              <th className="text-center">Category</th>
              <th className="text-center">Attachment</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading practice tests…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No practice tests found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row._id}
                  className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <td className="px-4 py-2 font-bold text-slate-300">{row.title}</td>
                  <td className="px-4 py-2 text-center">{row.totalQuestionCount}</td>
                  <td className="px-4 py-2 text-center">{row.category}</td>

                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3 justify-center">
                      <Tooltip text="Download">
                        <button
                          onClick={() => downloadFile(row)}
                          className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-blue-600"
                        >
                          <FiDownload />
                        </button>
                      </Tooltip>

                      <Tooltip text="Preview">
                        <button
                          onClick={() => openPreview(row)}
                          className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-yellow-600"
                        >
                          <FiEye />
                        </button>
                      </Tooltip>
                    </div>
                  </td>

                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center">
                      <Tooltip text="Delete Practice">
                        <button
                          onClick={() => deleteOne(row)}
                          className="px-2.5 py-1.5 rounded bg-white/5 text-white hover:bg-red-500"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reuse modal */}
    {previewOpen && previewData && (
     <PracticeTestPreview
     open={previewOpen}
     onClose={() => setPreviewOpen(false)}
     title={previewData.title}
     questions={previewData.questions}
   />
 )}
    </div>
  );
}
