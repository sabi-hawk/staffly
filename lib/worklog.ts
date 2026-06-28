// Plain (non-client) helper so server components can import it safely.
// (Importing a function from a "use client" module into a server component yields a
//  client-reference proxy that throws when called.)

/** Render Tiptap JSON to a short text preview. */
export function workLogPreview(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const out: string[] = [];
  const walk = (node: any) => {
    if (node.text) out.push(node.text);
    (node.content ?? []).forEach(walk);
  };
  walk(json);
  return out.join(" ").trim();
}
