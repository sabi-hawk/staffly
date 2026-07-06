/** @type {import('next').NextConfig} */
const nextConfig = {
  // Verification/agent builds set NEXT_DIST_DIR (e.g. ".next-verify") so `next build`/`next start`
  // never clobber the .next the owner's `next dev` is serving from — a concurrent build corrupting
  // the dev cache is what caused the recurring "Cannot find module './NNNN.js'" crashes.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
