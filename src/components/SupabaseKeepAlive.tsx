"use client";
import { useEffect } from "react";

// Fires a lightweight /api/ping on first load to wake the Supabase free-tier DB.
// Prevents 5-10s cold start delay on the first real user action.
export default function SupabaseKeepAlive() {
  useEffect(() => {
    fetch("/api/ping").catch(() => {});
  }, []);
  return null;
}