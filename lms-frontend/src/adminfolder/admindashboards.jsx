import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CandidatesInfo from "./admintabs/candidatesinfo";
import TestTab from "./admintabs/testTab";
import SubjectsTab from "./admintabs/subjects";
import PracticeTest from "./admintabs/practiceTest";
import SubjectTestTab from "./admintabs/subjecttesttab";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("notice"); // default highlight

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-2 py-1 rounded-xl font-medium transition-all duration-300 text-xs shadow-md ${
        activeTab === id
          ? "bg-green-700 text-slate-300 hover:bg-green-900"
          : "bg-emerald-500 text-slate-800 hover:bg-emerald-300 hover:text-black"
      }`}
    >
      {label}
    </button>
  );

const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  navigate("/login");
};


  return (
    <div className="min-h-screen bg-black text-green-400">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-gradient-to-tl from-slate-800 to-slate-5900 shadow-md border-b border-emerald-500">
        <h1 className="text-xl text-emerald-500 font-semibold tracking-wide">Admin Dashboard</h1>

        <nav className="flex items-center space-x-4">
          <TabBtn id="subject test" label="Subject Test" />
          <TabBtn id="practice test" label="Practice Test" />
          <TabBtn id="notice" label="Notice" />
          <TabBtn id="logs" label="Logs" />
          <TabBtn id="subjects" label="Subjects" />
          <TabBtn id="tests" label="Tests" />
          <TabBtn id="candidates" label="Candidates" />

          <button
            onClick={handleLogout}
            className="px-2 py-1 rounded-xl font-medium text-slate-200 bg-red-700 hover:bg-red-600 transition-all duration-300 shadow-md text-sm"
          >
            Logout
          </button>
        </nav>
      </header>

      {/* Placeholder body (tabs content later) */}
     <main className="p-6">
  {activeTab === "candidates" && <CandidatesInfo />}
  {activeTab === "tests" && <TestTab />}
  {activeTab === "subjects" && <SubjectsTab />}
  {activeTab === "practice test" && <PracticeTest />}
  {activeTab === "subject test" && <SubjectTestTab />}
  {activeTab !== "candidates" && activeTab !== "tests" && activeTab !== "subjects" && activeTab !== "practice test" && activeTab !== "subject test" && (
    <div className="border border-emerald-500 rounded-lg p-6 text-white/60">
      Header ready. We’ll add tab content next.
    </div>
  )}
</main>

    </div>
  );
}
