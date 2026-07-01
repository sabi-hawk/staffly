// Shared CRM document helpers (server-side use in route handlers).
export const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Verify the file's leading bytes match the claimed MIME (don't trust the browser Content-Type). */
export function magicMatches(mime: string, b: Uint8Array): boolean {
  switch (mime) {
    case "application/pdf": return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
    case "image/png": return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case "image/jpeg": return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/webp": // RIFF....WEBP
      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
        && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return b[0] === 0x50 && b[1] === 0x4b; // PK zip (docx)
    case "application/msword": return b[0] === 0xd0 && b[1] === 0xcf; // OLE (legacy .doc)
    default: return false;
  }
}
