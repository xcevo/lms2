import { useEffect, useMemo, useRef, useState } from "react";
import { FiDownload, FiEye, FiTrash2, FiRefreshCw, FiUploadCloud } from "react-icons/fi";
import TestPreview from "../adminModels/testPreview";
import Tooltip from "../../components/tooltip";
import { FaUpload } from "react-icons/fa";
import API_BASE_URL from "../../../config";

const ENDPOINT = `${API_BASE_URL}/api/admin-test`;

export default function TestTab() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { testTitle, questions: [...] }
  const fileInputRef = useRef(null);

  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    setLoading(true);
    try {
      // try without cache so server returns 200 + JSON body
      let res = await fetch(`${ENDPOINT}/alltests`, {
        headers: { ...authHeaders, Accept: "application/json" },
        cache: "no-store",
      });
      // If something still returned 304 (or a proxy did), retry with a cache-buster
      if (res.status === 304) {
        res = await fetch(`${ENDPOINT}/alltests?ts=${Date.now()}`, {
          headers: { ...authHeaders, Accept: "application/json" },
          cache: "no-store",
        });
      }
     if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed to load tests (HTTP ${res.status})`);
      }
      const data = await res.json();
      // tolerate both shapes: [ ... ]  OR  { tests: [ ... ] }
      const list =
        Array.isArray(data) ? data :
        Array.isArray(data?.tests) ? data.tests :
        [];
      setTests(list);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* initial load */ }, []);

  const onChooseFile = (e) => setFile(e.target.files?.[0] ?? null);

  const uploadTest = async () => {
    if (!file) return alert("Please choose an .xlsx file first.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${ENDPOINT}/upload-test`, {
        method: "POST",
        headers: authHeaders,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");
      // optimistic – prepend the new one or just refresh
      await fetchAll();
      setFile(null);
      fileInputRef.current?.value && (fileInputRef.current.value = "");
    } catch (e) {
      console.error(e);
      alert(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteOne = async (t) => {
    if (!confirm(`Delete test "${t.title}"?`)) return;
    try {
      const res = await fetch(`${ENDPOINT}/delete/${encodeURIComponent(t._id)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      setTests((arr) => arr.filter((x) => x._id !== t._id));
    } catch (e) {
      console.error(e);
      alert(e.message || "Delete failed");
    }
  };

  const openPreview = async (t) => {
    try {
      const res = await fetch(`${ENDPOINT}/preview/${encodeURIComponent(t._id)}`, {
        headers: { ...authHeaders, Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Preview failed");
      setPreviewData({ testTitle: data.testTitle, questions: data.questions || [] });
      setPreviewOpen(true);
    } catch (e) {
      console.error(e);
      alert(e.message || "Preview failed");
    }
  };

  const downloadFile = async (t) => {
    try {
      const res = await fetch(`${ENDPOINT}/download/${encodeURIComponent(t._id)}`, {
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
      // Try to read name from header; else fall back to title
      const cd = res.headers.get("content-disposition") || "";
      const nameMatch = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      const safe = (nameMatch && nameMatch[1].replace(/['"]/g, "")) || `${t.title}.xlsx`;
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

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onChooseFile}
            className="hidden"
            id="testFileInput"
          />
          <label
            htmlFor="testFileInput"
            className="px-2 py-1 rounded-md bg-white/5 border border-slate-600 text-slate-200 text-sm cursor-pointer hover:bg-white/20"
          >
            Choose File
          </label>

          <button
            onClick={uploadTest}
            disabled={!file || uploading}
            className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-sky-500  text-sm flex items-center gap-2 disabled:opacity-60"
            >

            <FaUpload className="text-white" size={16} />
            Upload New Test
          </button>
          {file && (
            <span className="text-sm text-slate-400">
              Selected: <span className="text-slate-200">{file.name}</span>
            </span>
          )}
        </div>
        <Tooltip text = "Refresh list">
        <button
          onClick={fetchAll}
          className="p-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
          
        >
          <FiRefreshCw  className="text-white" />
        </button>
        </Tooltip>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-emerald-900">
        <table className="w-full text-sm text-slate-200">
          <thead className="bg-white/10 text-slate-400 border-b-[0.3px] border-slate-800">
            <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
              <th>TEST NAME</th>
              <th className="text-center">Duration (min)</th>
              <th className="text-center">Total Questions</th>
              <th className="text-center">Randomized</th>
              <th className="text-center">Passing Percentage</th>
              <th className="text-center">Attachment</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>

        <tbody className="divide-y divide  ">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                Loading tests…
              </td>
            </tr>
          ) : tests.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                No tests found.
              </td>
            </tr>
          ) : (
            tests.map((t) => (
              <tr key={t._id}  className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors">
                <td className="px-4 py-2 font-bold text-slate-300 ">{t.title}</td>
                <td className="px-4 py-2 text-center">{t.duration}</td>
                <td className="px-4 py-2 text-center">{t.totalQuestionCount}</td>
                <td className="px-4 py-2 text-center">{t.randomizedQuestionCount}</td>
                <td className="px-4 py-2 text-center">{t.passingPercentage}%</td>

                {/* Attachment icons */}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3 justify-center">
                    <Tooltip text="Download">
                    <button
                      onClick={() => downloadFile(t)}
                      className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-blue-600"
                        >
                      <FiDownload />
                    </button>
                    </Tooltip>

                     <Tooltip text="Test preview">
                    <button
                      onClick={() => openPreview(t)}
                      className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-yellow-600"
                        >
                      <FiEye />
                    </button>
                    </Tooltip>
                  </div>
                </td>

                {/* Delete */}
                <td className="px-4 py-2">
                  <div className="flex items-center justify-center">
                    <Tooltip text="Delete Test">
                    <button
                      onClick={() => deleteOne(t)}
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

      {/* Preview modal */}
      {previewOpen && previewData && (
        <TestPreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={previewData.testTitle}
          questions={previewData.questions}
        />
      )}
    </div>
  );
}
