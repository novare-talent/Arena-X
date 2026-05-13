"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  LogOut, ChevronDown, Users, Bell, ShieldCheck, User as UserIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { LogoKasa, Wordmark, Kabuto, dbTierToKabuto } from "@/components/ui-samurai/primitives";

const NAV_LINKS = [
  { href: "/dashboard",   label: "Home"        },
  { href: "/battle",      label: "Battle"      },
  { href: "/learn",       label: "Learn"       },
  { href: "/hackathons",  label: "Tournaments" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/roadmap",     label: "Roadmap"     },
];

export default function Navbar({ user }: { user: User }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifCount,  setNotifCount]  = useState(0);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [userTier,    setUserTier]    = useState("unrated");

  const displayName = user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split("@")[0] || "Warrior";

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/friends/notifications");
        const { count } = await res.json();
        setNotifCount(count ?? 0);
      } catch { /* ignore */ }

      try {
        const supabase = createClient();
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) return;
        const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", u.id).single();
        setIsAdmin(profile?.is_admin ?? false);
        const { data: rating } = await supabase.from("user_ratings").select("tier").eq("user_id", u.id).eq("track", "dsa").single();
        if (rating?.tier) setUserTier(rating.tier);
      } catch { /* ignore */ }
    }
    fetchData();
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/friends/notifications");
        const { count } = await res.json();
        setNotifCount(count ?? 0);
      } catch { /* ignore */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const kabutoTier = dbTierToKabuto(userTier);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b"
      style={{ background: "rgba(8,7,13,0.88)", backdropFilter: "blur(12px)", borderColor: "var(--ink-4)" }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <LogoKasa size={26} />
          <span className="hidden sm:block"><Wordmark size={16} /></span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className="relative px-3 py-1.5 text-xs transition-colors font-cond"
                style={{
                  letterSpacing: "0.18em",
                  color: active ? "var(--bone)" : "var(--smoke)",
                  borderBottom: active ? "1px solid var(--violet-400)" : "1px solid transparent",
                  paddingBottom: active ? "calc(0.375rem - 1px)" : "0.375rem",
                }}
              >
                {label.toUpperCase()}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0"
                    style={{ background: "rgba(124,58,237,0.08)" }}
                    transition={{ type: "spring", duration: 0.3 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* How-to-play button — only on dashboard */}
          {pathname === "/dashboard" && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("arenax:welcome"))}
              title="How to play"
              className="hidden sm:flex items-center justify-center font-cond text-xs"
              style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--ink-4)", background: "var(--ink-3)", color: "var(--smoke)", cursor: "pointer", letterSpacing: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--violet-400)"; (e.currentTarget as HTMLElement).style.color = "var(--violet-300)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-4)"; (e.currentTarget as HTMLElement).style.color = "var(--smoke)"; }}
            >?</button>
          )}

          {/* Quick Duel CTA */}
          <Link
            href="/battle"
            className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-cond text-white transition-all btn-glow"
            style={{
              background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))",
              border: "1px solid rgba(196,181,253,0.3)",
              letterSpacing: "0.18em",
            }}
          >
            QUICK DUEL ⟶
          </Link>

          {/* Bell */}
          <Link
            href="/friends"
            className="relative flex items-center justify-center w-8 h-8 rounded transition-colors"
            style={{ border: "1px solid var(--ink-4)", color: "var(--smoke)" }}
          >
            <Bell className="w-3.5 h-3.5" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white leading-none"
                style={{ background: "var(--loss)", borderColor: "var(--ink-1)" }}>
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded transition-colors"
              style={{ border: "1px solid var(--ink-4)" }}
            >
              {/* Kabuto avatar */}
              <div className="relative" style={{
                background: "conic-gradient(from 220deg, var(--violet-300), var(--violet-700), var(--orchid), var(--violet-300))",
                padding: 1.5, borderRadius: "50%",
              }}>
                <div style={{ background: "var(--ink-2)", borderRadius: "50%", padding: 1 }}>
                  <Kabuto size={24} tier={kabutoTier} glow={false} />
                </div>
              </div>
              <span className="text-xs hidden sm:block max-w-20 truncate font-cond"
                style={{ color: "var(--ash)", letterSpacing: "0.1em" }}>
                {displayName.toUpperCase()}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform`} style={{ color: "var(--smoke)", transform: profileOpen ? "rotate(180deg)" : "" }} />
            </button>

            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-2xl z-50"
                style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}
              >
                <div className="p-3" style={{ borderBottom: "1px solid var(--ink-4)" }}>
                  <p className="text-[10px] font-cond" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>SIGNED IN AS</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--bone)" }}>{user.email}</p>
                </div>

                {[
                  { href: "/profile", icon: UserIcon, label: "Profile" },
                  { href: "/friends", icon: Users,    label: "Friends", badge: notifCount > 0 ? notifCount : null },
                ].map(({ href, icon: Icon, label, badge }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[rgba(124,58,237,0.08)]"
                    style={{ color: "var(--ash)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-cond" style={{ letterSpacing: "0.12em" }}>{label.toUpperCase()}</span>
                    </div>
                    {badge && (
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: "var(--loss)" }}>
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </Link>
                ))}

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[rgba(124,58,237,0.08)]"
                    style={{ color: "var(--violet-300)" }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="font-cond" style={{ letterSpacing: "0.12em" }}>ADMIN PANEL</span>
                  </Link>
                )}

                <div style={{ borderTop: "1px solid var(--ink-4)" }}>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[rgba(244,63,94,0.08)]"
                    style={{ color: "#f43f5e" }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="font-cond" style={{ letterSpacing: "0.12em" }}>SIGN OUT</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
