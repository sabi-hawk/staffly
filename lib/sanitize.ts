// Server-side sanitizer for BD-supplied rich text (lead job_description / notes). Sanitizing at the
// WRITE path means the stored value is always safe, regardless of how it's later rendered.
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["b", "strong", "i", "em", "u", "p", "br", "ul", "ol", "li", "a"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // force safe link attributes on any anchors
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } }),
  },
};

/** Sanitize rich text to a small safe allowlist. Returns null when the result is effectively empty. */
export function sanitizeRichText(html: string | null | undefined): string | null {
  if (html == null || html === "") return null;
  const clean = sanitizeHtml(html, OPTIONS).trim();
  // treat "just <br>/whitespace" as empty
  return clean.replace(/<br\s*\/?>/gi, "").replace(/&nbsp;/gi, "").trim() ? clean : null;
}
