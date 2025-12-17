// src/components/subpop.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  getExampleNumber,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import useDebounce from "../utils/useDebounce";
import { FaCheck, FaTimes } from "react-icons/fa";

import Tooltip from "./tooltip";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";

// ISO country code -> flag emoji
const flagEmoji = (cc) =>
  cc
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt()));

// Stable list of countries: [{code, dial, label}]
const useCountryList = () =>
  useMemo(() => {
    return getCountries()
      .map((code) => {
        const dial = getCountryCallingCode(code);
        return {
          code,
          dial,
          label: `${flagEmoji(code)}  +${dial}`,
        };
      })
      .sort((a, b) => a.dial.localeCompare(b.dial));
  }, []);

export default function SubPop({ open, onClose }) {
  if (!open) return null;

  const COUNTRIES = useCountryList();
  const [country, setCountry] = useState("GB"); // default UK

  // Fallback in case API isn’t reachable
  const SUBJECTS = ["Maths", "Science", "English", "Coding", "Space", "Robotics"];
  // Live options from backend (names only)
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const loadedOnceRef = useRef(false);

  // Load once when modal opens
  useEffect(() => {
    if (!open || loadedOnceRef.current) return;
    setLoadingSubjects(true);
    fetch(`${API_BASE_URL}/api/candidate/subjects/options`)
      .then(r => r.json())
      .then((data) => {
        const names = Array.isArray(data?.subjects)
          ? data.subjects.map((s) => s?.name).filter(Boolean)
          : [];
        // de-dupe & set
        setSubjectOptions(Array.from(new Set(names)));
      })
      .catch(() => {
        // ignore – fallback SUBJECTS will render
      })
      .finally(() => {
        setLoadingSubjects(false);
        loadedOnceRef.current = true;
      });
  }, [open]);

  // Prefer live options, else fallback
  const SUBJECT_NAMES = subjectOptions.length ? subjectOptions : SUBJECTS;

  const METHODS = [
    "Credit / Debit Card",
    "UPI / Wallet",
    "Net Banking",
    "PayPal",
    "Bank Transfer",
  ];

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    parentEmail: "",
    parentPhone: "",
    name: "",
    username: "",
    subjects: [],
    method: METHODS[0],
    agree: false,
    password: "",
    confirmPassword: "",
  });

 // Username availability state
 const [uState, setUState] = useState({ status: 'idle', ok: null, msg: '', suggestions: [] });
 const debouncedUsername = useDebounce(form.username, 450);

  // NEW: eye toggles (only for UI)
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const toggleSubject = (s) =>
    setForm((f) => ({
      ...f,
      subjects: f.subjects.includes(s)
        ? f.subjects.filter((x) => x !== s)
        : [...f.subjects, s],
    }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = value;

    if (name === "parentPhone") {
      val = value.replace(/\D/g, "");
    } else if (name === "name") {
      val = value.replace(/[^a-zA-Z\s]/g, "");
    } else if (name === "username") {
      // no spaces in username
      val = value.replace(/\s+/g, "");
    } else if (name === "password" || name === "confirmPassword") {
      val = value.replace(/\s/g, "");
    }

    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : val }));
  };

  const maxLen = useMemo(() => {
    try {
      const ex = getExampleNumber(country, examples);
      return ex?.nationalNumber?.length || 15;
    } catch {
      return 15;
    }
  }, [country]);

 // Live username check
 useEffect(() => {
   const raw = debouncedUsername.trim();
   if (!raw) {
     setUState({ status: 'idle', ok: null, msg: '', suggestions: [] });
     return;
   }
   // client-side quick rule
   const valid = /^[a-zA-Z0-9_-]{3,20}$/.test(raw);
   if (!valid) {
     setUState({ status: 'invalid', ok: false, msg: '3–20 chars. Letters, numbers, _ - only.', suggestions: [] });
     return;
   }
   let cancelled = false;
   setUState((s) => ({ ...s, status: 'checking' }));
   fetch(`${API_BASE_URL}/api/candidates/username/check?u=${encodeURIComponent(raw)}`)
     .then(r => r.json())
     .then((j) => {
       if (cancelled) return;
       if (j.available) {
         setUState({ status: 'ok', ok: true, msg: 'Username is available', suggestions: [] });
       } else {
         setUState({
           status: 'taken',
           ok: false,
           msg: j.reason === 'invalid' ? 'Invalid username' : 'Username already exists',
           suggestions: Array.isArray(j.suggestions) ? j.suggestions.slice(0, 5) : []
         });
       }
     })
     .catch(() => {
       if (!cancelled) setUState({ status: 'error', ok: false, msg: 'Could not verify username', suggestions: [] });
     });
   return () => { cancelled = true; };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [debouncedUsername]);
 
const pwMatch =
  form.password.length > 0 &&
  form.confirmPassword.length > 0 &&
  form.password === form.confirmPassword;
const pwReady =
  form.password.length > 0 && form.confirmPassword.length > 0;

// NEW: all required fields present?
const requiredFilled =
  form.firstName.trim().length > 0 &&
  form.lastName.trim().length > 0 &&
  form.parentEmail.trim().length > 0 &&
  form.parentPhone.trim().length > 0 &&
  form.username.trim().length > 0 && uState.ok === true &&
  form.subjects.length > 0;

// Enable only when everything above is satisfied
const proceedEnabled = requiredFilled && form.agree && pwReady && pwMatch;

// Rich tooltip reasons
const proceedTooltip = !form.agree
  ? "Please accept Terms & Conditions"
  : form.firstName.trim().length === 0 || form.lastName.trim().length === 0
  ? "Enter first and last name"
  : form.parentEmail.trim().length === 0
  ? "Enter parent's email"
  : form.parentPhone.trim().length === 0
  ? "Enter parent's phone"
  : form.username.trim().length === 0
  ? "Choose a username"
  : form.subjects.length === 0
  ? "Choose at least one subject"
  : !pwReady
  ? "Create and confirm a password"
  : !pwMatch
  ? "Passwords do not match"
  : undefined;


  const handleSubmit = async (e) => {
    e.preventDefault();

    const phone = parsePhoneNumberFromString(form.parentPhone, country);
    if (!phone || !phone.isValid()) {
      toast.error(`Please enter a valid phone number for ${country}`);
      return;
    }
    const e164 = phone.number;
    const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ");


    try {
      const res = await fetch(`${API_BASE_URL}/api/candidates/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentEmail: form.parentEmail,
          parentPhoneE164: e164,
          country,
          name: fullName,
          username: form.username,
          subjects: form.subjects,
          method: form.method,
          password: form.password
        
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to register");

      toast.success("Candidate registered");
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const handleNamePart = (part) => (e) => {
  const clean = e.target.value.replace(/[^a-zA-Z]/g, "");
  setForm((f) => ({ ...f, [part]: clean }));
};


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center select-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

      <div
        className="relative z-10 w-[92%] max-w-2xl rounded-2xl border border-emerald-800
                   bg-gradient-to-b from-white/8 text-slate-300 shadow-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="text-lg md:text-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-300 bg-clip-text text-transparent">
            LMS Subscription
          </div>
          <Tooltip text="close">
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-white/10 text-slate-200"
              aria-label="Close"
            >
              x
            </button>
          </Tooltip>
        </div>

        {/* Body: Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Parent’s Email
              </label>
              <input
                type="email"
                name="parentEmail"
                value={form.parentEmail}
                onChange={handleChange}
                placeholder="John@email.com"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2
                           text-slate-200 placeholder:text-slate-400 focus:outline-none
                           focus:ring-1 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Parent’s Phone
              </label>

              <div className="grid grid-cols-[9.5rem,1fr] gap-2 items-center">
                <select
                  aria-label="Country code"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2
                             text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-gray-900">
                      {c.label}
                    </option>
                  ))}
                </select>

                <input
                  type="tel"
                  name="parentPhone"
                  value={form.parentPhone}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={maxLen}
                  placeholder={`number`}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2
                             text-slate-200 placeholder:text-slate-400 focus:outline-none
                             focus:ring-1 focus:ring-green-500"
                  required
                />
              </div>

              <p className="mt-1 text-xs text-slate-400">
                Digits only. Length adapts to the selected country.
              </p>
            </div>

           {/* Student Name (split into first/last) */}
<div className="md:col-span-2">
  <label className="block text-sm text-slate-400 mb-1">Student Name</label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <input
      type="text"
      placeholder="First name"
      value={form.firstName}
      onChange={handleNamePart("firstName")}
      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2
                 text-slate-200 placeholder:text-slate-400 focus:outline-none
                 focus:ring-1 focus:ring-green-500"
      required
    />
    <input
      type="text"
      placeholder="Last name"
      value={form.lastName}
      onChange={handleNamePart("lastName")}
      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2
                 text-slate-200 placeholder:text-slate-400 focus:outline-none
                 focus:ring-1 focus:ring-green-500"
      required
    />
  </div>
</div>

            {/* Username (no spaces) */}
            <div className="md:col-span-2">
    <label className="block text-sm text-slate-400 mb-1">Username</label>
    <div className="relative">
      <input
        type="text"
        name="username"
        value={form.username}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === " " || e.code === "Space") e.preventDefault();
        }}
        onPaste={(e) => {
          e.preventDefault();
          const t = (e.clipboardData || window.clipboardData).getData("text");
          setForm((f) => ({ ...f, username: t.replace(/\s+/g, "") }));
        }}
        placeholder="Choose a username"
        className={`w-full rounded-lg bg-white/5 border px-3 py-2
                    text-slate-200 placeholder:text-slate-400 focus:outline-none
                    focus:ring-1 ${
                      uState.ok === false
                        ? "border-red-600 focus:ring-red-500"
                        : uState.ok === true
                        ? "border-green-500"
                        : "border-white/10 focus:ring-green-500"
                    }`}
      />
      {/* tiny right status icon */}
      {uState.status !== 'idle' && (
  <span className="absolute right-3 top-1/2 -translate-y-1/2">
    {uState.ok === true ? (
      <FaCheck size={12} className="text-emerald-400" aria-hidden="true" />
    ) : uState.ok === false ? (
       <FaTimes size={12} className="text-red-500" aria-hidden="true" />
    ) : (
      <span role="img" aria-label="checking">⏳</span>
    )}
  </span>
)}

    </div>

    {/* helper / suggestions */}
    <div className="mt-1 text-xs">
      {uState.msg && (
        <p className={uState.ok ? "text-emerald-400" : "text-red-400"}>{uState.msg}</p>
      )}
     {uState.ok === false && uState.suggestions.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-2">
    {uState.suggestions.map((s) => (
      <Tooltip key={s} text="Use this username">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, username: s }))}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200 hover:bg-white/10"
          aria-label={`Use username ${s}`}
        >
          {s}
        </button>
      </Tooltip>
    ))}
  </div>
)}

    </div>
    <p className="mt-1 text-xs text-slate-400">Spaces are not allowed.</p>
  </div>
          </div>


          

          {/* Subjects */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Subjects</label>
           <div className="flex flex-wrap gap-2">
      {loadingSubjects && (
        <span className="text-xs text-slate-400">Loading subjects…</span>
      )}
      {SUBJECT_NAMES.map((s) => {
                const active = form.subjects.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleSubject(s)}
                    className={`rounded-full px-3 py-1 text-sm backdrop-blur border ${
                      active
                        ? "bg-green-500 border-green-800 text-gray-800 "
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passwords (with eye icons) */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Create password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create password"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2
                             pr-10 text-slate-200 placeholder:text-slate-400 focus:outline-none
                             focus:ring-1 focus:ring-green-500"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300/70 hover:text-slate-100"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    /* eye-off */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-4.4" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-1.2 2.5-3.5 4.4M6.4 16.4C4.7 15.2 3.5 13.7 3 13" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  ) : (
                    /* eye */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.7" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">Spaces are not allowed.</p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showPw2 ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 pr-10
                    text-slate-200 placeholder:text-slate-400 focus:outline-none
                    focus:ring-1 ${
                      !pwReady || pwMatch
                        ? "border-white/10 focus:ring-green-500"
                        : "border-red-600 focus:ring-red-500"
                    }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw2((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300/70 hover:text-slate-100"
                  aria-label={showPw2 ? "Hide password" : "Show password"}
                >
                  {showPw2 ? (
                    /* eye-off */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-4.4" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-1.2 2.5-3.5 4.4M6.4 16.4C4.7 15.2 3.5 13.7 3 13" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  ) : (
                    /* eye */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.7" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  )}
                </button>
              </div>
              {!pwMatch && pwReady && (
                <p className="mt-1 text-xs text-red-400">Passwords don’t match.</p>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Payment Method</label>
            <select
              name="method"
              value={form.method}
              onChange={handleChange}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2
                         text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {METHODS.map((m) => (
                <option key={m} value={m} className="bg-gray-900">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              name="agree"
              checked={form.agree}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-gray-800/70
                         checked:bg-emerald-500 checked:hover:bg-green-500
                         focus:ring-green-500"
            />
            <span>
              I agree to the{" "}
              <a href="#" className="text-green-400 underline underline-offset-2">
                Terms & Conditions
              </a>
              .
            </span>
          </label>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex items-center justify-end gap-2 border-t border-white/10">
          <Tooltip text={proceedTooltip}>
            <button
              onClick={handleSubmit}
              className="rounded-lg px-4 py-2 text-sm font-semibold
                         bg-gradient-to-r from-green-500 to-emerald-500 text-black
                         shadow-md hover:from-green-400 hover:to-emerald-400 disabled:opacity-60"
              type="button"
              disabled={!proceedEnabled}
            >
              Proceed
            </button>
          </Tooltip>
        </div>
      </div>
      
    </div>
    
  );
}
