// src/Login.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import tree from "./assets/ICTree.png";
import API_BASE_URL from "../config";
import SubPop from "./components/subpop";


export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubOpen, setSubOpen] = useState(false);
  const navigate = useNavigate();

  // pastel/neo-green numbers & symbols to float on left
const SYMBOLS = [
  "π","√","∞","∑","Δ","θ","Ω","μ","≈","≠","≤","≥","±",
  "E=mc²","F=ma","H₂O","CO₂","Na⁺","e⁻","x²","y=mx+c",
  "7","13","21","42","3.14"
];

// precompute positions so they don't jump while typing
const sprites = useMemo(
  () =>
    Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      sym: SYMBOLS[i % SYMBOLS.length],
      top: Math.random() * 40,        // 0–100% (inner box ke andar)
      left: Math.random() * 80,       // 0–100% (inner box ke andar)

      size: 14 + Math.random() * 28,   // 14–42px
      dur: 3 + Math.random() * 4,      // 9–17s
      delay: Math.random() * 2,        // 0–6s
      hue: [160, 175, 190, 200, 145][i % 5], // teal/green/cyan shades
      rot: -10 + Math.random() * 20,
    })),
  []
);


  const handleLogin = async () => {
    const identifier = (email || "").trim();  // email OR username
    if (!identifier || !password) {
      toast.error("Enter email/username and password");
      return;
    }

    setLoading(true);
    try {
      // ---- Try CANDIDATE login first ----
      let res = await fetch(`${API_BASE_URL}/api/candidates/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      let data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", "candidate");
        localStorage.setItem("candidate", JSON.stringify(data.candidate || {}));
        toast.success("Logged in");
        navigate("/candidate-dashboard", { replace: true });
        return;
      }

      // ---- Fallback to ADMIN login ----
      res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }),
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", "admin");
      toast.success("Logged in as Admin");
      navigate("/admin-dashboard", { replace: true });
    } catch (e) {
      toast.error("Login Failed — Please check your credentials");
    } finally {
      setLoading(false);
    }
  };


  const onKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="relative w-full h-[100vh] max-h-[1000px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900 to-black" />

      <div className="relative z-10 flex h-full">
       <div className="w-1/2 hidden md:flex items-center justify-center bg-black/30 border-r border-green-800 relative overflow-hidden">
   {/* floating symbols layer */}
 {/* floating symbols layer — centered cluster */}
<div className="absolute inset-0 pointer-events-none flex items-center justify-center">
  {/* ye inner box hi cluster ki boundary hai */}
  <div className="relative h-[70%] w-[70%]">
    {sprites.map((s) => (
      <span
        key={s.id}
        className="absolute select-none font-extrabold"
        style={{
          top: `${s.top}%`,
          left: `${s.left}%`,
          fontSize: `${s.size}px`,
          transform: `rotate(${s.rot}deg)`,
          color: `hsl(${s.hue} 90% 70%)`,
          textShadow: `0 0 16px hsl(${s.hue} 90% 45% / .25)`,
          animation: `floatY ${s.dur}s ease-in-out ${s.delay}s infinite,
                      driftX ${s.dur * 1.1}s ease-in-out ${s.delay / 2}s infinite`,
        }}
      >
        {s.sym}
      </span>
    ))}
  </div>
</div>

   {/* subtle starfield dots */}
   <div className="absolute inset-0 pointer-events-none">
     {Array.from({ length: 60 }).map((_, i) => (
       <span
         key={`dot-${i}`}
         className="absolute h-[2px] w-[2px] rounded-full bg-white/30"
         style={{
           top: `${Math.random() * 100}%`,
           left: `${Math.random() * 100}%`,
           animation: `twinkle ${3 + Math.random() * 4}s ease-in-out ${i * 0.15}s infinite`,
         }}
       />
     ))}
   </div>
   {/* local keyframes for left panel */}
   <style>{`
     @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-28px) } }
     @keyframes driftX { 0%,100% { transform: translateX(0) } 50% { transform: translateX(16px) } }
     @keyframes twinkle { 0%,100% { opacity: .2; transform: scale(1) } 50% { opacity: .8; transform: scale(1.25) } }
     @keyframes popIn  { 0% { opacity: 0; transform: translateY(6px) scale(.96) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
   `}</style>

   {/* bottom caption (centered) */}
<div className="absolute bottom-14 left-0 right-0 z-10 px-6">
  <div className="mx-auto max-w-xl text-center">
    <h2 className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight">
      <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
        Learn with <span className="text-emerald-300">Colours</span>, Think with <span className="text-cyan-300">Curiosity</span>!
      </span>
    </h2>

    <p className="mt-2 text-sm md:text-base text-emerald-200/80">
      A playful space to explore <span className="text-emerald-200">Maths</span>,{" "}
      <span className="text-cyan-200">Science</span>, <span className="text-teal-200">English</span> & more.
    </p>

    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {["Maths","Science","English","Coding","Space","Robotics"].map((chip,i)=>(
        <span
          key={chip}
          className="rounded-full border border-emerald-500/30 bg-emerald-900/30 px-3 py-1 text-xs md:text-sm text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,.15)] backdrop-blur"
          style={{ animation: `popIn 420ms ${i*70}ms both` }}
        >
          {chip}
        </span>
      ))}
    </div>
  </div>
</div>

 </div>

        <div className="w-full md:w-1/2 flex flex-col items-center justify-center h-full text-center text-white">
          <img src={tree} alt="Semiconductor Icon" className="mb-4 w-24 h-24 object-contain drop-shadow-lg rounded-full" />

          <h2 className="relative text-lg md:text-xl lg:text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-white to-cyan-400 bg-[length:200%_100%] bg-clip-text mb-6 tracking-wide uppercase">
            REVOLUTIONIZING <br /> SEMICONDUCTOR IC DESIGN EDUCATION
          </h2>

          <div className="bg-white/5 text-green-400 rounded-xl w-96 p-10 border border-green-700 shadow-[0_0_25px_rgba(34,197,94,0.7)]">
            <input
              type="text"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-full p-3 border border-green-500 rounded-lg mb-4 bg-white/5 text-green-300 placeholder-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition"
            />

            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                className="w-full p-3 pr-10 border border-green-700 rounded-lg bg-white/5 text-green-300 placeholder-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition"
              />
              <button
                type="button"
                aria-label="toggle password visibility"
                className="absolute inset-y-0 right-3 flex items-center text-green-500"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 text-black font-semibold p-3 rounded-lg shadow-lg hover:from-green-500 hover:to-green-400 hover:shadow-xl transition-all duration-300 disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Login"}
            </button>
          </div>

          <p className="mt-6 text-white text-sm md:text-base">&nbsp;</p>
          {/* Premium CTA under the card */}
<div className="mt-4 text-center">
 <button
   type="button"
   onClick={() => setSubOpen(true)}
   className="inline-flex items-center gap-2 rounded-full px-4 py-2
              bg-white/5 backdrop-blur-sm ring-1 ring-emerald-400/30
              shadow-[0_8px_30px_rgba(16,185,129,0.15)]"
 >
   <span className="text-amber-300 text-lg">👑</span>
   <span className="bg-gradient-to-r from-amber-300 via-emerald-400 to-green-300
                    bg-clip-text text-transparent font-semibold tracking-wide
                    [text-shadow:0_0_12px_rgba(16,185,129,.25)]">
     Get your subscription now
   </span>
 </button>
</div>

        </div>
      </div>
      <SubPop open={isSubOpen} onClose={() => setSubOpen(false)} />

    </div>
  );
}
