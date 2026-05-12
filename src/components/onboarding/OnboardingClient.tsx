"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Zap, CheckCircle2, XCircle, Loader2, ArrowRight, User } from "lucide-react";

const COUNTRIES = [
  "India", "USA", "UK", "Canada", "Australia", "Germany",
  "Singapore", "UAE", "Other",
];

const EXPERIENCE_OPTIONS = [
  { value: "student",  label: "Student" },
  { value: "0-1yr",   label: "0–1 year" },
  { value: "1-3yr",   label: "1–3 years" },
  { value: "3+yr",    label: "3+ years" },
];

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function OnboardingClient({
  userId, username: initialUsername, displayName: initialDisplayName,
  college: initialCollege, country: initialCountry,
}: {
  userId: string;
  username: string;
  displayName: string;
  college: string;
  country: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername]       = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName || initialUsername);
  const [college, setCollege]         = useState(initialCollege);
  const [country, setCountry]         = useState(initialCountry || "India");
  const [experience, setExperience]   = useState("student");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate username on change
  useEffect(() => {
    if (username === initialUsername) { setUsernameStatus("idle"); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameStatus("invalid"); return;
    }
    setUsernameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, initialUsername, supabase]);

  async function handleSave() {
    if (usernameStatus === "taken" || usernameStatus === "invalid") return;
    if (!username || username.length < 3) { setError("Username is required."); return; }
    setSaving(true);
    setError(null);

    const { data: updated, error: updateErr } = await supabase
      .from("profiles")
      .update({
        username:             username.toLowerCase(),
        display_name:         displayName || username,
        college:              college || null,
        country:              country || null,
        experience_level:     experience,
        onboarding_completed: true,
      })
      .eq("id", userId)
      .select("id");

    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }

    if (!updated || updated.length === 0) {
      // RLS blocked the update — fall back to API route which uses service role
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username: username.toLowerCase(),
          display_name: displayName || username,
          college: college || null,
          country: country || null,
          experience_level: experience,
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Failed to save profile." }));
        setError(msg ?? "Failed to save profile. Please try again.");
        setSaving(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  const canSave = usernameStatus !== "taken" && usernameStatus !== "invalid" && usernameStatus !== "checking" && username.length >= 3;

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white relative">
            Arena<span className="text-[#6366f1]">X</span>
            <span className="absolute -top-2 -right-8 text-[9px] font-bold px-1 py-0.5 rounded bg-[#6366f1] text-white leading-none tracking-wide">BETA</span>
          </span>
        </div>

        <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-7">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome to the Arena</h1>
          <p className="text-sm text-[#5a5a7a] mb-7">Set up your profile before you start competing.</p>

          <div className="space-y-5">
            {/* Username */}
            <div>
              <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide block mb-1.5">
                Username <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a7a] text-sm">@</span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                  placeholder="yourhandle"
                  className="w-full bg-[#111118] border border-[#2a2a3a] rounded-xl pl-7 pr-10 py-2.5 text-sm text-white placeholder-[#3a3a5a] focus:outline-none focus:border-[#6366f1]/50 transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking"   && <Loader2 className="w-4 h-4 text-[#5a5a7a] animate-spin" />}
                  {usernameStatus === "available"  && <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />}
                  {usernameStatus === "taken"      && <XCircle className="w-4 h-4 text-red-400" />}
                  {usernameStatus === "invalid"    && <XCircle className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              {usernameStatus === "taken"   && <p className="text-xs text-red-400 mt-1">Already taken</p>}
              {usernameStatus === "invalid" && <p className="text-xs text-red-400 mt-1">3–20 chars, letters/numbers/underscores only</p>}
              {usernameStatus === "available" && <p className="text-xs text-[#22c55e] mt-1">Available!</p>}
            </div>

            {/* Display name */}
            <div>
              <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide block mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-[#111118] border border-[#2a2a3a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#3a3a5a] focus:outline-none focus:border-[#6366f1]/50 transition-colors"
                />
              </div>
            </div>

            {/* College */}
            <div>
              <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide block mb-1.5">
                College / Company <span className="text-[#3a3a5a]">(optional)</span>
              </label>
              <input
                value={college}
                onChange={e => setCollege(e.target.value)}
                placeholder="IIT Delhi, Google, etc."
                className="w-full bg-[#111118] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#3a3a5a] focus:outline-none focus:border-[#6366f1]/50 transition-colors"
              />
            </div>

            {/* Country + Experience */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide block mb-1.5">Country</label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full bg-[#111118] border border-[#2a2a3a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366f1]/50 transition-colors"
                >
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide block mb-1.5">Experience</label>
                <select
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  className="w-full bg-[#111118] border border-[#2a2a3a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366f1]/50 transition-colors"
                >
                  {EXPERIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Setting up…</>
                : <>Enter the Arena <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}