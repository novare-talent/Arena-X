import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit backed by Postgres (the `check_rate_limit` RPC in
 * supabase/schema_v5_optimizations.sql). No Redis/Upstash required.
 *
 * FAILS OPEN by design: if the RPC/table isn't deployed yet, or the DB errors,
 * the request is ALLOWED. A missing migration must never break a core flow
 * (submitting code, matchmaking). The limiter is a guard rail, not a gate.
 *
 * @returns true if the request is within the limit, false if it should be 429'd.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return true; // fail open — limiter infra not ready
    return data !== false;
  } catch {
    return true; // fail open — never block core flows on limiter failure
  }
}
