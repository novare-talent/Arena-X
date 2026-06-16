"use client";

import { useState, useRef } from "react";
import { Upload, Link as LinkIcon, AlertCircle } from "lucide-react";

const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export default function SubmissionForm({
  challengeId, submissionFormats, maxFileMb, onSubmitted,
}: {
  challengeId: string;
  submissionFormats: string[];
  maxFileMb: number;
  onSubmitted?: () => void;
}) {
  const [format, setFormat] = useState<string>(submissionFormats[0]);
  const [file, setFile] = useState<File | null>(null);
  const [externalLink, setExternalLink] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLinkOnly = format === "link";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isLinkOnly) {
      if (!/^https?:\/\//i.test(externalLink)) {
        setError("Please enter a valid URL (http:// or https://)."); return;
      }
    } else {
      if (!file) { setError("Pick a file to upload."); return; }
      if (file.size > maxFileMb * 1024 * 1024) {
        setError(`File exceeds ${maxFileMb}MB limit.`); return;
      }
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("challenge_id", challengeId);
      fd.append("format", format);
      if (file && !isLinkOnly) fd.append("file", file);
      if (externalLink) fd.append("external_link", externalLink);
      if (notes) fd.append("notes", notes);

      const res = await fetch("/api/forge/submit", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      onSubmitted?.();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}
      style={{ padding: "20px 22px", border: "1px solid #2a2a2a", borderRadius: 12, background: "#1a1a1a", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: "#666", letterSpacing: "0.18em" }}>SUBMIT</div>

      {/* Format picker */}
      <div>
        <div style={{ fontFamily: BODY, fontSize: 11, color: "#aaa", marginBottom: 6 }}>Format</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {submissionFormats.map((f) => (
            <button key={f} type="button" onClick={() => { setFormat(f); setFile(null); }}
              style={{ padding: "6px 14px", borderRadius: 999, fontFamily: BODY, fontSize: 11, cursor: "pointer",
                       background: format === f ? "#fff" : "transparent",
                       color: format === f ? "#111" : "#aaa",
                       border: format === f ? "1px solid #fff" : "1px solid #2a2a2a",
                       letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* File picker (non-link) */}
      {!isLinkOnly && (
        <div>
          <div style={{ fontFamily: BODY, fontSize: 11, color: "#aaa", marginBottom: 6 }}>
            File <span style={{ color: "#666" }}>· max {maxFileMb}MB</span>
          </div>
          <div onClick={() => inputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px dashed #2a2a2a", borderRadius: 8, background: "#111", cursor: "pointer", color: "#999", fontFamily: BODY, fontSize: 12 }}>
            <Upload style={{ width: 14, height: 14 }} />
            <span>{file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "Click to choose a file"}</span>
            <input ref={inputRef} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
      )}

      {/* External link (always available as bonus context; required for link format) */}
      <div>
        <div style={{ fontFamily: BODY, fontSize: 11, color: "#aaa", marginBottom: 6 }}>
          {isLinkOnly ? "Live URL" : "Live URL (optional — repo / deploy / demo)"}
        </div>
        <div style={{ position: "relative" }}>
          <LinkIcon style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#666" }} />
          <input type="url" value={externalLink} onChange={(e) => setExternalLink(e.target.value)}
            placeholder="https://..."
            style={{ width: "100%", padding: "10px 12px 10px 32px", borderRadius: 8, background: "#111", border: "1px solid #2a2a2a", color: "#ddd", fontFamily: BODY, fontSize: 12 }} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <div style={{ fontFamily: BODY, fontSize: 11, color: "#aaa", marginBottom: 6 }}>
          Notes to the judge <span style={{ color: "#666" }}>· optional, 4000 chars</span>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 4000))} rows={4}
          placeholder="What you built, what trade-offs you made, what to look at first."
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#111", border: "1px solid #2a2a2a", color: "#ddd", fontFamily: BODY, fontSize: 12, resize: "vertical" }} />
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)", color: "#f43f5e", fontFamily: BODY, fontSize: 11 }}>
          <AlertCircle style={{ width: 13, height: 13 }} />
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting}
        style={{ padding: "10px 22px", borderRadius: 8, background: submitting ? "#777" : "#fff", color: "#111", border: "none", fontFamily: BODY, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: submitting ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
        {submitting ? "SUBMITTING…" : "SUBMIT"}
      </button>

      <div style={{ fontFamily: BODY, fontSize: 10, color: "#666", lineHeight: 1.5 }}>
        Submissions are final once accepted. The reference solution unlocks immediately after you submit. Judging runs Sunday night IST; Elo + leaderboard update Monday.
      </div>
    </form>
  );
}
