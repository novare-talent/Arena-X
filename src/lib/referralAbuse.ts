import { createHash } from "crypto";

/**
 * Lowercase + strip `+tag` from the local part. Mirrors the
 * `public.normalize_email()` SQL function so client/server checks agree.
 */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").toLowerCase().replace(/\+[^@]*@/, "@");
}

/**
 * SHA-256 hash of the client's IP, derived from common forwarding headers.
 * We never store the raw IP — only the hash goes into signup_throttle.
 */
export function ipHashFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  const ip = first
    || headers.get("x-real-ip")
    || headers.get("cf-connecting-ip")
    || headers.get("x-client-ip")
    || "";
  if (!ip) return "";
  return createHash("sha256").update(ip).digest("hex");
}