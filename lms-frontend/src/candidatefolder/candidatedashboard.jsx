import Header from "./Header";
import SubCards from "./subcards";

export default function CandidateDashboard() {
  return (
    <div className="min-h-screen flex flex-col text-white overflow-hidden">
      <Header />

      <main className="flex-1 py-6">
        <SubCards />
      </main>
    </div>
  );
}
