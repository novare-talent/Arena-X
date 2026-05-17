"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

/**
 * Shared markdown renderer with explicit element styling.
 * No dependency on @tailwindcss/typography — every element is styled inline
 * so it renders correctly on dark backgrounds across the app
 * (DSA problem statements, prompt-battle goals, AI judge feedback, model output).
 */

const components: Components = {
  h1: ({ children }) => (
    <h1 className="font-display" style={{ fontSize: 24, color: "var(--bone)", margin: "20px 0 10px", lineHeight: 1.15 }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display" style={{ fontSize: 19, color: "var(--bone)", margin: "18px 0 8px", lineHeight: 1.2 }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-cond" style={{ fontSize: 15, fontWeight: 700, color: "var(--bone)", margin: "16px 0 6px", letterSpacing: "0.04em" }}>{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="font-cond" style={{ fontSize: 13, fontWeight: 700, color: "var(--ash)", margin: "14px 0 6px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{children}</h4>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 14, color: "var(--ash)", lineHeight: 1.7, margin: "0 0 12px" }}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong style={{ color: "var(--bone)", fontWeight: 700 }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: "var(--violet-200)", fontStyle: "italic" }}>{children}</em>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: "var(--violet-300)", textDecoration: "underline", textUnderlineOffset: 2 }}>{children}</a>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: "0 0 12px", paddingLeft: 22, listStyleType: "disc" }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: "0 0 12px", paddingLeft: 22, listStyleType: "decimal" }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: 14, color: "var(--ash)", lineHeight: 1.65, margin: "4px 0" }}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ margin: "0 0 12px", padding: "6px 16px", borderLeft: "3px solid var(--violet-500)", background: "rgba(124,58,237,0.07)", color: "var(--ash)", fontStyle: "italic" }}>{children}</blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) {
      // Highlighted block — <pre> wrapper handles layout
      return <code className={className}>{children}</code>;
    }
    return (
      <code style={{
        fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
        fontSize: "0.85em", color: "var(--violet-200)",
        background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)",
        borderRadius: 4, padding: "1px 6px",
      }}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre style={{
      margin: "0 0 14px", padding: 16, borderRadius: 10, overflowX: "auto",
      background: "var(--ink-3, #15101f)", border: "1px solid var(--ink-4, #241a36)",
      fontFamily: "var(--font-mono), 'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.55,
    }}>{children}</pre>
  ),
  hr: () => (
    <hr style={{ border: "none", borderTop: "1px solid var(--ink-4, #241a36)", margin: "18px 0" }} />
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "0 0 14px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--ink-4, #241a36)", color: "var(--bone)", fontWeight: 700, background: "rgba(124,58,237,0.08)" }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--ink-4, #241a36)", color: "var(--ash)" }}>{children}</td>
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} style={{ maxWidth: "100%", borderRadius: 8, margin: "0 0 12px" }} />
  ),
};

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="ax-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {children ?? ""}
      </ReactMarkdown>
    </div>
  );
}