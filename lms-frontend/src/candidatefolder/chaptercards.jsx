// src/candidatefolder/chaptercards.jsx
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import LeftSidebar from "./leftsidebar";
import PdfPane from "./PdfPane";
import VideoPane from "./VideoPane";
import API_BASE_URL from "../../config";
import Tooltip from "../components/tooltip";
import ChapterTest from "./chapterTest";
import PracticeTestCards from "./practicetestcards"; 

// ---- PNG icons (as requested) ----
import BulbPng from "../assets/bulb.png";            // Learn
import InteractivePng from "../assets/Interactive.png"; // Interactive
import PracticePng from "../assets/Prctice.png";     // Practice test
import TestPng from "../assets/Test.png";            // Chapter test

/* ---------- helpers ---------- */
const toCount = (arr) => (Array.isArray(arr) ? arr.length : 0);

function toStaticUrl(p) {
  if (!p) return "";
  const str = String(p).replaceAll("\\", "/");
  if (/^https?:\/\//i.test(str)) return str;
  const idx = str.toLowerCase().indexOf("/uploads/");
  const path = idx >= 0 ? str.slice(idx) : str;
  return `${API_BASE_URL}${path}`;
}

/* ---------- reusable big icon button class ---------- */
const iconBtn =
  "inline-flex shine-anim items-center justify-center h-20 w-20 rounded-lg border border-emerald-900 " 
  "bg-white/5 hover:bg-white/10 shadow-sm transition-colors p-2";

/* ---------- Learn View (topics + PDF + Video) ---------- */
function LearnView({ subject, chapter, onBack }) {
  const [activeTopic, setActiveTopic] = useState(
    Array.isArray(chapter?.topics) && chapter.topics.length ? chapter.topics[0] : null
  );

  const pdfUrl = useMemo(() => toStaticUrl(chapter?.pdfPath), [chapter]);
  const videoUrl = useMemo(() => toStaticUrl(chapter?.videoPath), [chapter]);

  return (
    <div className="relative">
      {/* left topics */}
      <LeftSidebar
        chapter={chapter}
        onClose={onBack}
        onSelectTopic={setActiveTopic}
        activeTopicId={activeTopic?._id}
      />

      {/* main area (2 panes) */}
      <div className="ml-48 sm:ml-56 pt-0 pr-2 pb-4 ">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PdfPane url={pdfUrl} page={activeTopic?.pdfPage ?? 1} />
          <VideoPane url={videoUrl} seekTo={activeTopic?.videoStartSec ?? 0} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Chapters grid ---------- */
export default function ChapterCards({ subject, onBack }) {
 const [mode, setMode] = useState("list"); // "list" | "learn" | "test" | "practice"
 const [selectedChapter, setSelectedChapter] = useState(null);

  const chapters = useMemo(
    () => (Array.isArray(subject?.chapters) ? subject.chapters : []),
    [subject]
  );

    if (mode === "test" && selectedChapter) {
    return (
      <ChapterTest
        subject={subject}
        chapter={selectedChapter}
        onBack={() => {
          setMode("list");
          setSelectedChapter(null);
        }}
      />
    );
  }

  if (mode === "learn" && selectedChapter) {
    return (
      <LearnView
        subject={subject}
        chapter={selectedChapter}
        onBack={() => {
          setMode("list");
          setSelectedChapter(null);
        }}
      />
    );
  }

 if (mode === "practice" && selectedChapter) {
   return (
     <PracticeTestCards
       inline
       open
       subjectId={subject?._id || subject?.id}
       chapter={selectedChapter}
       onClose={() => {
         setMode("list");
         setSelectedChapter(null);
       }}
     />
   );
 }
  

  return (
    <section className="px-4 sm:px-6 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-emerald-400 font-medium text-xl">
          {subject?.name} — <span className="opacity-90">Chapters</span>
        </h2>

        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/70 bg-gradient-to-tl from-slate-800 to-slate-5900 hover:bg-white/10 px-3 py-1.5 text-lg text-slate-200"
        >
          <ChevronLeft size={16} className="text-emerald-400" /> Back to subjects
        </button>
      </div>

      {/* 6 cards per row on xl+; gracefully wrap on smaller screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-16">
        {chapters.map((ch) => {
          const topicsCount = toCount(ch.topics);
          return (
            <div
              key={ch._id || ch.name}
              className="group relative z-30 hover:z-50 rounded-2xl text-center
                        border border-emerald-900/60 bg-gradient-to-tl from-slate-800 to-slate-5900 hover:bg-white/10
                        transition-colors p-4 w-[280px] md:w-[300px] mx-auto
                        overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.35)]
                        hover:shadow-[0_12px_36px_rgba(16,185,129,0.25)]"
            >
              {/* premium ring + soft glow (behind content) */}
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-emerald-500/20" />
              <span
                className="pointer-events-none absolute -inset-px rounded-[18px] opacity-0
                          group-hover:opacity-100 transition duration-500"
                style={{
                  background:
                    "radial-gradient(120% 60% at 80% 0%, rgba(100, 13, 100, 0.57), transparent 60%)",
                }}
              />

              {/* glancing sweep on hover */}
              <span
                className="pointer-events-none absolute -inset-8 -translate-x-[120%] rotate-12
                          bg-gradient-to-r from-transparent via-white/20 to-transparent
                          opacity-0 group-hover:opacity-100
                          group-hover:translate-x-[120%] transition-transform duration-700 ease-out"
              />
               <div className="relative z-10">
              <div className="text-emerald-400 font-medium text-xl">{ch.name}</div>
              <div className="text-xs text-slate-300/90 mt-1">{ch.description || "—"}</div>

              <div className="mt-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {topicsCount} {topicsCount === 1 ? "topic" : "topics"}
                </span>
              </div>

              {/* Big icon row (text removed; shown only on hover via title) */}
              <div className="mt-4 grid grid-cols-2 gap-6 w-fit mx-auto place-items-center">
                {/* Learn */}
                <Tooltip text="Learn">
                <button
                 
                  aria-label="Learn"
                  onClick={() => {
                    setSelectedChapter(ch);
                    setMode("learn");
                  }}
                  className={`${iconBtn} hover:bg-slate-800`}
                >
                  <img src={BulbPng} alt="" className="h-18 w-18 object-contain" />
                  <span className="sr-only">Learn</span>
                </button>
                </Tooltip>

                {/* Interactive */}
                <Tooltip text="Interactive">
                <button  aria-label="Interactive" className={iconBtn}>
                  <img src={InteractivePng} alt="" className="h-18 w-18 object-contain" />
                  <span className="sr-only">Interactive</span>
                </button>
                </Tooltip>

                {/* Practice test */}
                <Tooltip text="Practice questions">
                <button  aria-label="Practice test"
                onClick={() => {
                  setSelectedChapter(ch);
                  setMode("practice");
                }}
                className={iconBtn}>
                  <img src={PracticePng} alt="" className="h-18 w-18 object-contain" />
                  <span className="sr-only">Practice test</span>
                </button>
                </Tooltip>

                {/* Chapter test */}
                <Tooltip text="Chapter test">
                <button
                  aria-label="Chapter test"
                  onClick={() => {
                    setSelectedChapter(ch);
                    setMode("test");
                  }}
                  className={iconBtn}
                >
                  <img src={TestPng} alt="" className="h-18 w-18 object-contain" />
                  <span className="sr-only">Chapter test</span>
                </button>
                </Tooltip>
              </div>
              </div>
            </div>
          );
        })}
      </div>
 
    </section>
  );
}
