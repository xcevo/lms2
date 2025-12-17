import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import Tooltip from "../components/tooltip";

export default function Header() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("candidate");
      const obj = raw ? JSON.parse(raw) : null;
      setName(obj?.name || "");
    } catch {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("candidate");
    navigate("/", { replace: true });
  };

  return (
   <header className="sticky top-0 z-40 w-full border-b border-emerald-700 bg-gradient-to-tl from-slate-800 to-slate-5900 backdrop-blur-sm">
  <div className="w-full px-4 py-2 grid grid-cols-3 items-center">
    {/* Left: candidate name */}
    <h1 className="justify-self-start text-base sm:text-lg font-semibold text-emerald-400">
      <span className="text-white">Welcome</span> {name || "Candidate"}
    </h1>

    {/* Center: Brand */}
    <h1 className="justify-self-center text-sm sm:text-lg md:text-xl font-semibold text-slate-100 tracking-wide select-none">
      X
      <span className="text-emerald-500">C</span>
      <span className="text-emerald-500">E</span>
      VO&nbsp;Academy
    </h1>

    {/* Right: Logout */}
    <div className="justify-self-end">
      <Tooltip text="Logout">
        <button
          onClick={handleLogout}
          className="px-2 py-1 rounded-xl font-medium text-slate-100 bg-red-700 hover:bg-red-600 transition-all duration-300 shadow-md text-sm"
          aria-label="Logout"
        >
          <FiLogOut size={16} />
          <span className="sr-only">Logout</span>
        </button>
      </Tooltip>
    </div>
  </div>
</header>

  );
}
