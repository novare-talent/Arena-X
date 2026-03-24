"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Zap, Swords, Trophy, Map, BarChart3,
  User as UserIcon, LogOut, ChevronDown, Users, Bell, LayoutGrid,
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/dashboard",   label: "Home",        icon: Zap         },
  { href: "/arena",       label: "Arena",       icon: Swords      },
  { href: "/rooms",       label: "Rooms",       icon: LayoutGrid  },
  { href: "/contests",    label: "Contests",    icon: Trophy      },
  { href: "/roadmap",     label: "Roadmap",     icon: Map         },
  { href: "/leaderboard", label: "Leaderboard", icon: BarChart3   },
];

export default function Navbar({ user }: { user: User }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifCount, setNotifCount]   = useState(0);

  const displayName = user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split("@")[0] || "Challenger";

  // Fetch notification count on mount and periodically
  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/friends/notifications");
        const { count } = await res.json();
        setNotifCount(count ?? 0);
      } catch { /* ignore */ }
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[#2a2a3a]">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white hidden sm:block">
            Arena<span className="text-[#6366f1]">X</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-[#6b6b8a] hover:text-[#a1a1b5]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20"
                    transition={{ type: "spring", duration: 0.3 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Bell — notifications */}
          <Link
            href="/friends"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-[#2a2a3a] text-[#6b6b8a] hover:text-white hover:border-[#6366f1]/30 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f97316] border-2 border-[#0a0a0f] flex items-center justify-center text-[10px] font-bold text-white leading-none">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>

          {/* Find Match CTA */}
          <Link
            href="/arena"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all btn-glow"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            <Swords className="w-3.5 h-3.5" />
            Find Match
          </Link>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a3a] hover:border-[#6366f1]/30 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {displayName[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-[#a1a1b5] hidden sm:block max-w-24 truncate">{displayName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#5a5a7a] transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-full mt-2 w-48 bg-[#111118] border border-[#2a2a3a] rounded-xl overflow-hidden shadow-xl z-50"
              >
                <div className="p-3 border-b border-[#2a2a3a]">
                  <p className="text-xs text-[#5a5a7a]">Signed in as</p>
                  <p className="text-sm text-white font-medium truncate">{user.email}</p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#a1a1b5] hover:text-white hover:bg-[#1a1a24] transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  Profile
                </Link>

                <Link
                  href="/friends"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 text-sm text-[#a1a1b5] hover:text-white hover:bg-[#1a1a24] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Friends
                  </div>
                  {notifCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#f97316] flex items-center justify-center text-[10px] font-bold text-white">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </Link>

                <div className="border-t border-[#2a2a3a]">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
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