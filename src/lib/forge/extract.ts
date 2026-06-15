// Extract human-readable text from a submission artifact so we can feed it
// to the gpt-4o judge. We keep the budget aggressive — 50k chars max for
// archives/PDFs, 20k for external links — to bound OpenAI cost per judge.

const TEXT_CAP_LARGE = 50_000;
const TEXT_CAP_LINK = 20_000;

const TEXT_EXTENSIONS = new Set([
  "md", "txt", "rst",
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "rb", "go", "rs", "java", "kt", "swift",
  "c", "h", "cc", "cpp", "hpp",
  "json", "yml", "yaml", "toml",
  "sh", "bash", "ps1",
  "sql",
  "html", "css", "scss",
  "csv", "tsv",
  "env.example",
]);

const SPECIAL_FILES = new Set([
  "readme", "readme.md", "readme.txt",
  "claude.md", "operating.md", "spec.md", "prompt.md",
  "package.json", "tsconfig.json",
  "dockerfile", "makefile",
]);

function isTextFile(name: string): boolean {
  const lower = name.toLowerCase();
  if (SPECIAL_FILES.has(lower)) return true;
  if (SPECIAL_FILES.has(lower.split("/").pop() ?? "")) return true;
  const ext = lower.split(".").pop();
  return !!ext && TEXT_EXTENSIONS.has(ext);
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + `\n\n... [truncated; original ${s.length} chars]`;
}

async function extractFromPdf(bytes: ArrayBuffer): Promise<string> {
  // pdf-parse is not installed by default — try to import dynamically so the
  // build doesn't break in environments without it. Fallback to a stub.
  try {
    type PdfParse = (b: Buffer) => Promise<{ text: string }>;
    const mod = (await import(/* webpackIgnore: true */ "pdf-parse")) as unknown as { default: PdfParse } | PdfParse;
    const pdfParse: PdfParse = typeof mod === "function" ? mod : mod.default;
    const result = await pdfParse(Buffer.from(bytes));
    return clip(result.text ?? "", TEXT_CAP_LARGE);
  } catch (err) {
    return `[PDF text extraction unavailable in this runtime: ${String(err).slice(0, 200)}]`;
  }
}

async function extractFromZip(bytes: ArrayBuffer): Promise<string> {
  // Use the platform's CompressionStream where available; fallback to a stub
  // that just notes the size. (Vercel/Node ≥18 supports it.)
  try {
    // We avoid adding a dependency; instead try to parse the central directory
    // ourselves with a tiny implementation. We only need uncompressed sizes
    // and names for text files. To stay simple and robust, we fall back to
    // letting the judge know the zip's filenames if extraction fails.
    const mod = await import(/* webpackIgnore: true */ "unzipper").catch(() => null) as
      | { Open: { buffer: (b: Buffer) => Promise<{ files: { path: string; buffer: () => Promise<Buffer> }[] }> } }
      | null;
    if (!mod) {
      return `[zip artifact: ${bytes.byteLength} bytes — unzipper not installed; judge will rely on notes + external link]`;
    }
    const dir = await mod.Open.buffer(Buffer.from(bytes));
    const parts: string[] = [];
    let used = 0;
    for (const entry of dir.files) {
      if (used > TEXT_CAP_LARGE) break;
      if (!isTextFile(entry.path)) continue;
      try {
        const buf = await entry.buffer();
        const text = buf.toString("utf8");
        const header = `\n\n----- ${entry.path} -----\n`;
        const remaining = TEXT_CAP_LARGE - used;
        const slice = clip(text, Math.max(0, remaining - header.length));
        parts.push(header + slice);
        used += header.length + slice.length;
      } catch { /* skip bad entry */ }
    }
    return parts.join("") || "[zip contained no recognized text files]";
  } catch (err) {
    return `[zip extraction failed: ${String(err).slice(0, 200)}]`;
  }
}

export async function extractArtifactText(args: {
  format: string;
  bytes?: ArrayBuffer | null;
  externalLink?: string | null;
  notes?: string | null;
}): Promise<string> {
  const { format, bytes, externalLink, notes } = args;
  let body = "";

  if (format === "pdf" && bytes) {
    body = await extractFromPdf(bytes);
  } else if (format === "zip" && bytes) {
    body = await extractFromZip(bytes);
  } else if ((format === "md" || format === "code") && bytes) {
    try {
      body = clip(Buffer.from(bytes).toString("utf8"), TEXT_CAP_LARGE);
    } catch {
      body = "[failed to decode artifact as utf-8]";
    }
  } else if (format === "link" && externalLink) {
    body = `[Link submission — judge must inspect: ${externalLink}]`;
    body = clip(body, TEXT_CAP_LINK);
  } else {
    body = "[no artifact body available]";
  }

  if (notes && notes.trim()) {
    body += `\n\n----- LEARNER NOTES -----\n${notes.slice(0, 4000)}`;
  }
  if (externalLink && format !== "link") {
    body += `\n\n----- EXTERNAL LINK -----\n${externalLink.slice(0, 1000)}`;
  }
  return body;
}
