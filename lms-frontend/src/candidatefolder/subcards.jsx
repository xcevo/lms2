// src/candidatefolder/subcards.jsx
import { useEffect, useState } from "react";
import API_BASE_URL from "../../config";
import ChapterCards from "./chaptercards";
import SubTestAppear from "./subTestAppear";



/* ---------------- Subject Card (circular) ---------------- */
function SubjectCard({ subject, onSelect, onTest  }) {
  const chapters = Array.isArray(subject?.chapters) ? subject.chapters.length : 0;

  return (
    <div className="w-full flex">
      <div
        onClick={() => onSelect?.(subject)}
        className="
          group relative aspect-square w-full max-w-[280px] cursor-pointer
          rounded-full border border-emerald-900 bg-gradient-to-tl from-slate-800 to-slate-5900
          shadow-[0_0_18px_rgba(34,197,94,.12)]
          hover:shadow-[0_0_28px_rgba(34,197,94,.25)]
          hover:bg-white/10 transition-all duration-300
        "
      >
        {/* inner glow */}
        <div className="pointer-events-none absolute inset-3 rounded-full bg-gradient-to-b from-white/10 to-transparent" />

        {/* content */}
        <div className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center p-6">
          <h3 className="text-xl font-semibold text-green-400">{subject?.name}</h3>

          <p className="mt-1 text-xs text-green-200/80 line-clamp-2">
            {subject?.description || "No description yet."}
          </p>

          <div className="mt-3 text-xs text-green-300/90">
            <span className="inline-flex items-center gap-2 rounded-full border border-green-700/60 bg-white/5 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              {chapters} {chapters === 1 ? "chapter" : "chapters"}
            </span>
          </div>

          {/* Test (no functionality) */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTest?.(subject); }}
            className="mt-4 px-3 py-1 rounded-full font-medium text-slate-200 bg-green-700 hover:bg-green-600 transition-all duration-300 shadow-md text-sm"
          >
            Test
          </button>
        </div>
      </div>
    </div>
  );
}





/* ---------------- Container: Subjects ↔ Chapters ---------------- */
export default function SubCards() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");
  const [activeSubject, setActiveSubject] = useState(null); // <— NEW
  const [subjectForTest, setSubjectForTest] = useState(null);


  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");

        const res = await fetch(`${API_BASE_URL}/api/candidates/my-subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load subjects");

        const data = await res.json();
        setSubjects(Array.isArray(data?.subjects) ? data.subjects : []);
      } catch (e) {
        setError("Failed to load your subjects.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <section className="w-full max-w-6xl mx-auto px-4 ">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl border border-green-700/40 bg-white/5 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full max-w-6xl mx-auto px-4">
        <div className="rounded-xl border border-red-700/60 bg-red-900/20 text-red-200 px-4 py-3">
          {error}
        </div>
      </section>
    );
  }

  if (!subjects.length) {
    return (
      <section className="w-full max-w-6xl mx-auto px-4">
        <div className="rounded-xl border border-green-700/60 bg-white/5 text-green-200 px-4 py-3">
          You don’t have any subscribed subjects yet.
        </div>
      </section>
    );
  }
 // If user is appearing a subject test → show the appear screen
 if (subjectForTest) {
   return <SubTestAppear subject={subjectForTest} onBack={() => setSubjectForTest(null)} />;
 }

  // If a subject is selected → show its chapters
if (activeSubject) {
   return <ChapterCards subject={activeSubject} onBack={() => setActiveSubject(null)} />;
 }

  // Default → subjects grid (left-aligned)
  return (
    <section className="w-full px-4 sm:px-6 md:px-8 ">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 place-items-start justify-items-start justify-start">
        {subjects.map((s) => (
           <SubjectCard key={s._id || s.id} subject={s} onSelect={setActiveSubject} onTest={setSubjectForTest} />
        ))}
      </div>
    </section>
  );
}
