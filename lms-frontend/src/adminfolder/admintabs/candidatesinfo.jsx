import React, { useEffect, useMemo, useState, useRef } from "react";
import API_BASE_URL from "../../../config";
import useDebounce from "../../utils/useDebounce";
import { FiTrash2, FiEdit2,  FiX } from "react-icons/fi";
import Tooltip from "../../components/tooltip";

/**
 * Small subject library for quick multi-select chips.
 * You can extend this list anytime — it only affects the editor UI,
 * not how the data is stored (still an array of strings).
 */
const SUBJECT_LIBRARY = ["Maths", "Science", "English", "Coding", "Space", "Robotics"];
const subjectNames = (arr) =>
  Array.isArray(arr)
    ? arr.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean)
    : [];


export default function CandidatesInfo() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ name: "", passwordPlain: "", subjects: [] });
 // username edit + validation
  const [uname, setUname] = useState("");
  const [uStatus, setUStatus] = useState({ state: "idle", suggestions: [] }); 
  const debouncedUname = useDebounce(uname, 450);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // search box state
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 300); // smooth typing
  const searchRef = useRef(null);
      // NEW: live options from backend (names only)
const [subjectOptions, setSubjectOptions] = useState([]);
const [loadingSubjects, setLoadingSubjects] = useState(false);
const loadedOnceRef = useRef(false);


  const token = useMemo(() => localStorage.getItem("token"), []);

    const deleteCandidate = async (c) => {
  if (!token) {
    setErr("Missing token. Please login again.");
    return;
  }

  const ok = window.confirm(
    `Delete ${c.name || "this candidate"}? This cannot be undone.`
  );
  if (!ok) return;

  try {
    setDeletingId(c._id);
    setErr("");

    const res = await fetch(
      `${API_BASE_URL}/api/admin/candidate/delete/${encodeURIComponent(c._id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to delete candidate");

    // remove row locally
    setRows((prev) => prev.filter((r) => r._id !== c._id));
    if (editingId === c._id) cancelEdit();
  } catch (e) {
    setErr(e.message || "Failed to delete candidate");
  } finally {
    setDeletingId(null);
  }
};

useEffect(() => {
  if (loadedOnceRef.current) return;
  loadedOnceRef.current = true;

  (async () => {
    try {
      setLoadingSubjects(true);
      const res = await fetch(`${API_BASE_URL}/api/candidate/subjects/options`);
      const data = await res.json();

      // expect: { count, subjects: [{ _id, name }, ...] }
      const names = Array.isArray(data?.subjects)
        ? data.subjects.map(s => s?.name).filter(Boolean)
        : [];

      if (names.length) setSubjectOptions(names);
    } catch {
      // swallow – fallback list will be used
    } finally {
      setLoadingSubjects(false);
    }
  })();
}, []);



 // --- debounced unique-username check (same contract as popup) ---
 useEffect(() => {
   if (!editingId) return;
   const original = rows.find((r) => r._id === editingId)?.username || "";
   const raw = (debouncedUname || "").trim();
   if (!raw || raw === original) {
     setUStatus({ state: "ok", suggestions: [] }); // unchanged is OK
     return;
   }
   setUStatus({ state: "checking", suggestions: [] });
   (async () => {
     try {
       const res = await fetch(
         `${API_BASE_URL}/api/candidates/username/check?u=${encodeURIComponent(raw)}`
       );
       const data = await res.json();
       if (!res.ok) {
         setUStatus({ state: "invalid", suggestions: [] });
         return;
       }
       if (data?.available) {
         setUStatus({ state: "ok", suggestions: [] });
       } else {
         setUStatus({ state: "taken", suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [] });
       }
     } catch {
       setUStatus({ state: "invalid", suggestions: [] });
     }
   })();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [debouncedUname, editingId]);

  // -------- Fetch list (unchanged behavior) --------
  useEffect(() => {
    if (!token) {
      setErr("Missing token. Please login again.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/candidates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to fetch candidates");
        setRows(Array.isArray(data?.candidates) ? data.candidates : []);
      } catch (e) {
        setErr(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const startEdit = (c) => {
    setEditingId(c._id);
    setEdit({
      name: c.name || "",
      passwordPlain: "", // empty means "do not change"
      subjects: subjectNames(c.subjects),
    });
   setUname(c.username || "");
   setUStatus({ state: "idle", suggestions: [] });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit({ name: "", passwordPlain: "", subjects: [] });
    setUname("");
    setUStatus({ state: "idle", suggestions: [] });
  };

  const toggleSubject = (s) => {
    setEdit((prev) => {
      const on = new Set(prev.subjects || []);
      on.has(s) ? on.delete(s) : on.add(s);
      return { ...prev, subjects: [...on] };
    });
  };

// Shallow compare two arrays of subject *names* (order-insensitive)
const subjectsChanged = (a = [], b = []) => {
  const A = subjectNames(a).map(s => s.trim()).sort().join("|");
  const B = subjectNames(b).map(s => s.trim()).sort().join("|");
  return A !== B;
};


  const saveEdit = async (c) => {
    // Basic validation
    const nameTrim = String(edit.name || "").trim();
    if (!nameTrim) {
      setErr("Student name cannot be empty.");
      return;
    }
    if (edit.passwordPlain && /\s/.test(edit.passwordPlain)) {
      setErr("Password cannot contain spaces.");
      return;
    }

   // username rules
   const usernameTrim = String(uname || "").trim();
   const usernameChanged = usernameTrim && usernameTrim !== c.username;
   if (usernameChanged) {
     if (uStatus.state !== "ok") {
       setErr("Please choose an available username.");
       return;
     }
     // final allowlist (same as backend): letters, numbers, _, ., -
     if (!/^[a-zA-Z0-9_-]{3,20}$/.test(usernameTrim)) {
       setErr("Username is invalid.");
       return;
     }
   }

    // Build a minimal payload (only send changed fields)
    const payload = {};
    if (nameTrim !== c.name) payload.name = nameTrim;
    if (edit.passwordPlain) payload.passwordPlain = edit.passwordPlain;
    if (subjectsChanged(edit.subjects, c.subjects)) payload.subjects = edit.subjects;
    if (usernameChanged) payload.username = usernameTrim;

    // If there’s nothing to change, just close the editor
    if (!Object.keys(payload).length) {
      cancelEdit();
      return;
    }

    try {
      setSaving(true);
      setErr("");

      const res = await fetch(
        `${API_BASE_URL}/api/admin/candidate/update/${encodeURIComponent(c._id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update candidate");

      // Update the table with fresh candidate returned by backend
      const updated = data?.candidate;
      setRows((prev) => prev.map((r) => (r._id === c._id ? updated : r)));
      cancelEdit();
    } catch (e) {
      setErr(e.message || "Failed to update candidate");
    } finally {
      setSaving(false);
    }
  };

  const hasData = rows && rows.length > 0;

  // rows to show in table (filtered by search)
const viewRows = useMemo(() => {
  const needle = (dq || "").trim().toLowerCase();
  if (!needle) return rows;

  const hit = (v) => String(v || "").toLowerCase().includes(needle);

  return rows.filter((r) =>
    hit(r.parentEmail) ||
    hit(r.parentPhoneE164) ||
    hit(r.name) ||
    hit(r.username) ||
    hit(subjectNames(r.subjects).join(" ")) ||
    hit(r.method)
  );
}, [rows, dq]);


  const table = useMemo(
    () => (
      <div className="overflow-x-auto rounded-lg border border-green-600/40">
        <table className="min-w-full text-sm">
          <thead className="bg-white/10 text-slate-400 border-b-[1px] border-slate-800">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>Parent Email</th>
              <th>Parent Phone</th>
              <th>Student Name</th>
              <th>User Name</th>
              <th>Password (plain)</th>
              <th>Subjects</th>
              <th>Payment Method</th>
              <th className="w-[140px]">Actions</th>
            </tr>
          </thead>

          <tbody className="text-slate-300">
            {viewRows.length === 0 && (
          <tr>
            <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
              No matches found for “{q}”.
            </td>
          </tr>
        )}

            {(viewRows.length ? viewRows : []).map((c) => {
              const isEditing = editingId === c._id;
              return (
                <tr
                  key={c._id}
                  className="border-b border-slate-800 bg-white/5 hover:bg-white/10 transition-colors align-top"
                >
                  {/* Parent Email */}
                  <td className="px-3 py-2">{c.parentEmail}</td>

                  {/* Parent Phone */}
                  <td className="px-3 py-2">{c.parentPhoneE164}</td>

           {/* Student Name (editable) */}
<td className="px-3 py-2">
  {!isEditing ? (
    c.name
  ) : (
    <input
      className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-0.5 outline-none focus:ring-1 focus:ring-green-500"
      value={edit.name}
      onChange={(e) => {
        // only letters + space
        const cleaned = e.target.value.replace(/[^a-zA-Z ]+/g, "");
        setEdit((p) => ({ ...p, name: cleaned }));
      }}
      onKeyDown={(e) => {
        // allow control keys, arrows, tab, delete/backspace, cmd/ctrl combos
        const controlKeys = [
          "Backspace", "Delete", "ArrowLeft", "ArrowRight",
          "ArrowUp", "ArrowDown", "Home", "End", "Tab"
        ];
        if (
          controlKeys.includes(e.key) ||
          e.ctrlKey || e.metaKey ||           // copy/paste/select all etc.
          e.key === " " ||                    // space
          /^[a-zA-Z]$/.test(e.key)            // letters only
        ) return;
        e.preventDefault();                   // block anything else (digits, symbols)
      }}
      onPaste={(e) => {
        // sanitize pasted text to letters + space
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData).getData("text");
        setEdit((p) => ({ ...p, name: t.replace(/[^a-zA-Z ]+/g, "") }));
      }}
      placeholder="Full name"
    />
  )}
</td>


                  <td className="px-3 py-2">
  {!isEditing ? (
    c.username
  ) : (
    <>
      <input
        className={`w-full rounded-md border px-2 py-0.5 outline-none focus:ring-1
          bg-white/5 border-white/10
          ${
            uStatus.state === "ok" ? "focus:ring-emerald-500" :
            uStatus.state === "taken" || uStatus.state === "invalid" ? "focus:ring-red-500" :
            "focus:ring-green-500"
          }`}
        value={uname}
        onChange={(e) => {
          // allow only a-z A-Z 0-9 _ . -
          const cleaned = e.target.value.replace(/[^a-zA-Z0-9_-]/g, "");
          setUname(cleaned);
        }}
        onKeyDown={(e) => {
          // block space explicitly
          if (e.key === " " || e.code === "Space") e.preventDefault();
        }}
        onPaste={(e) => {
          e.preventDefault();
          const t = (e.clipboardData || window.clipboardData).getData("text");
          setUname((t || "").replace(/[^a-zA-Z0-9_-]/g, ""));
        }}
        placeholder="Username"
      />

      {/* Helper / status */}
      {uStatus.state === "taken" && (
        <div className="mt-1 text-[11px] text-red-300">
          Username already exists
        </div>
      )}
      {uStatus.state === "invalid" && (
        <div className="mt-1 text-[11px] text-red-300">
          Invalid username
        </div>
      )}
      {uStatus.state === "ok" && uname.trim() !== (rows.find(r => r._id === editingId)?.username || "") && (
        <div className="mt-1 text-[11px] text-emerald-300">
          Available
        </div>
      )}

      {/* Suggestions */}
      {uStatus.state === "taken" && uStatus.suggestions?.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {uStatus.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setUname(s)}
              className="text-xs rounded-full px-1 py-0.5 bg-white/5 border border-white/20 text-slate-300 hover:bg-white/10"
              title="Use this"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </>
  )}
</td>


                  {/* Password (editable) */}
                  <td className="px-3 py-2">
                    {!isEditing ? (
                      c.passwordPlain
                    ) : (
                  <input
                    className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-0.5 outline-none focus:ring-1 focus:ring-green-500"
                    value={edit.passwordPlain}
                    onChange={(e) =>
                      setEdit((p) => ({
                        ...p,
                        // remove all whitespace as user types
                        passwordPlain: e.target.value.replace(/\s+/g, "")
                      }))
                    }
                    onKeyDown={(e) => {
                      // block space key outright
                      if (e.key === " " || e.code === "Space") e.preventDefault();
                    }}
                    onPaste={(e) => {
                      // sanitize pasted text (no spaces)
                      e.preventDefault();
                      const t = (e.clipboardData || window.clipboardData).getData("text");
                      setEdit((p) => ({ ...p, passwordPlain: t.replace(/\s+/g, "") }));
                    }}
                    placeholder="Leave blank to keep"
                  />
                    )}
                    {isEditing && (
                      <div className="text-[11px] text-slate-400 mt-1">Spaces are not allowed.</div>
                    )}
                  </td>

                  {/* Subjects (editable) */}
                  <td className="px-3 py-2">
                    {!isEditing ? (
                     subjectNames(c.subjects).join(", ")
                     ) : (
                     <div className="flex flex-wrap gap-1">
  {(subjectOptions.length ? subjectOptions : SUBJECT_LIBRARY).map((s) => {
    const active = edit.subjects.includes(s);
    return (
      <button
        type="button"
        key={s}
        onClick={() => toggleSubject(s)}
        className={`px-2 py-0.5 rounded-full text-xs border transition
          ${active
            ? "bg-green-500 border-emerald-400 text-black"
            : "bg-white/5 border-white/20 text-slate-300 hover:bg-white/10"}`}
      >
        {s}
      </button>
    );
  })}
  {loadingSubjects && (
    <span className="text-xs text-slate-400 ml-2">loading…</span>
  )}
</div>

                    )}
                  </td>

                  {/* Payment (read-only) */}
                  <td className="px-3 py-2">{c.method}</td>

                  {/* Actions */}
                 <td className="px-3 py-2">
  {!isEditing ? (
    <div className="flex items-center gap-2">
 <Tooltip text="Edit candidate">
   <button
     onClick={() => startEdit(c)}
     aria-label="Edit candidate"
     className="p-1 rounded-md bg-white/5 text-white hover:bg-slate-700 hover:bg-green-500 transition">
     <FiEdit2 size={16} />
   </button>
 </Tooltip>
      <Tooltip text = "Delete candidate">
      <button
        onClick={() => deleteCandidate(c)}
        disabled={deletingId === c._id}
        className="p-1 rounded-md bg-white/5 text-white hover:bg-red-700 disabled:opacity-60"
      >
        <FiTrash2 size={18} />
      </button>
      </Tooltip>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <button
        disabled={saving}
        onClick={() => saveEdit(c)}
        className="px-2 py-0.5 rounded-md bg-emerald-600 text-black hover:bg-emerald-500 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        disabled={saving}
        onClick={cancelEdit}
        className="px-2 py-1 rounded-md bg-white/10 text-slate-200 hover:bg-white/20 disabled:opacity-60"
      >
        Cancel
      </button>

      {/* (Optional) allow delete even while editing */}
      <Tooltip text = "Delete candidate">
      <button
        onClick={() => deleteCandidate(c)}
        disabled={deletingId === c._id || saving}
        className="p-1 rounded-md bg-white/5 text-white hover:bg-red-700 disabled:opacity-60"
      >
        <FiTrash2 size={18} />
      </button>
      </Tooltip>
    </div>
  )}
</td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ),
    [rows, viewRows, q, editingId, edit, saving, uname, uStatus]
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold text-green-400">
    Candidates (Total {rows.length})
  </h2>

 {/* Search box (top-right) with clear (×) */}
 <div className="relative w-64">
   <input
     ref={searchRef}
     value={q}
     onChange={(e) => setQ(e.target.value)}
     placeholder="Search candidates…"
     className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 
                text-slate-200 placeholder:text-slate-400
                focus:outline-none focus:ring-1 focus:ring-green-500 pr-9"
   />
   {q && (
     <button
       type="button"
       aria-label="Clear search"
       onClick={() => { setQ(""); searchRef.current?.focus(); }}
       className="absolute right-2 top-1/2 -translate-y-1/2
                  p-1 rounded-full bg-white/20 hover:bg-red-700 text-slate-300"
     >
       <FiX size={14} />
     </button>
   )}
 </div>
</div>


      {loading && (
        <div className="border border-green-600/40 rounded-lg p-6 text-white/70">
          Loading candidates…
        </div>
      )}

      {!loading && err && (
        <div className="border border-red-600/40 rounded-lg p-4 text-red-300 bg-red-600/10">
          {err}
        </div>
      )}

      {!loading && !err && !hasData && (
        <div className="border border-green-600/40 rounded-lg p-6 text-white/70">
          No candidates yet.
        </div>
      )}

      {!loading && !err && hasData && table}
    </section>
  );
}
