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
import { Kabuto, dbTierToKabuto } from "@/components/ui-samurai/primitives";

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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{ height: 50, background: "rgba(17,17,17,0.95)", backdropFilter: "blur(12px)", borderColor: "#2a2a2a" }}>
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="ArenaX" style={{ height: 40, width: "auto", display: "block", pointerEvents: "none", userSelect: "none" }} draggable={false} />
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: "'DM Sans',system-ui,sans-serif",
                  fontSize: 12,
                  color: active ? "#fff" : "#999",
                  textDecoration: "none",
                  padding: "0 9px",
                  lineHeight: "50px",
                  whiteSpace: "nowrap",
                  transition: "color .12s",
                }}
              >
                {label}
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
              className="hidden sm:flex items-center justify-center"
              style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#777", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans',system-ui,sans-serif" }}
            >?</button>
          )}

          {/* Quick Duel CTA */}
          <Link
            href="/battle"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white transition-all"
            style={{
              fontFamily: "'DM Sans',system-ui,sans-serif",
              fontSize: 11, fontWeight: 500,
              background: "transparent",
              border: "1px solid #2a2a2a",
              letterSpacing: "0.06em",
            }}
          >
            Quick Duel →
          </Link>

          {/* Bell */}
          <Link
            href="/friends"
            className="relative flex items-center justify-center w-8 h-8 rounded transition-colors"
            style={{ border: "1px solid #2a2a2a", color: "#777" }}
          >
            <Bell className="w-3.5 h-3.5" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white leading-none"
                style={{ background: "var(--loss)", borderColor: "#111" }}>
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded transition-colors"
              style={{ border: "1px solid #2a2a2a" }}
            >
              {/* Avatar circle */}
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <Kabuto size={24} tier={kabutoTier} glow={false} />
              </div>
              <span className="text-xs hidden sm:block max-w-20 truncate"
                style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#bbb", letterSpacing: "0.05em" }}>
                {displayName}
              </span>
              <ChevronDown className="w-3 h-3 transition-transform" style={{ color: "#777", transform: profileOpen ? "rotate(180deg)" : "" }} />
            </button>

            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-2xl z-50"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              >
                <div className="p-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
                  <p className="text-[10px]" style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#777", letterSpacing: "0.12em" }}>Signed in as</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#ccc" }}>{user.email}</p>
                </div>

                {[
                  { href: "/profile", icon: UserIcon, label: "Profile" },
                  { href: "/friends", icon: Users,    label: "Friends", badge: notifCount > 0 ? notifCount : null },
                ].map(({ href, icon: Icon, label, badge }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                    style={{ color: "#bbb", fontFamily: "'DM Sans',system-ui,sans-serif" }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
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
                    className="flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                    style={{ color: "#a78bfa", fontFamily: "'DM Sans',system-ui,sans-serif" }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <div style={{ borderTop: "1px solid #2a2a2a" }}>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[rgba(244,63,94,0.06)]"
                    style={{ color: "#f43f5e", fontFamily: "'DM Sans',system-ui,sans-serif" }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
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
