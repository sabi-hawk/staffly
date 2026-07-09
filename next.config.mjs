import { loadEnv } from "./scripts/lib/env.mjs";

// Resolve the DEV/PROD toggle before Next inlines NEXT_PUBLIC_* : loadEnv() reads .env.local and, based
// on APP_ENV, copies the DEV_/PROD_-prefixed Supabase creds into the plain names the app reads. On Vercel
// there's no .env.local and no prefixes, so this is a no-op and the plain names you set there are used.
loadEnv();
// Show the environment badge only when this is NOT the real Vercel deployment (i.e. running locally),
// so employees never see it in production but you always know which DB your local app is hitting.
const showEnvBadge = process.env.VERCEL ? "" : "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Verification/agent builds set NEXT_DIST_DIR (e.g. ".next-verify") so `next build`/`next start`
  // never clobber the .next the owner's `next dev` is serving from — a concurrent build corrupting
  // the dev cache is what caused the recurring "Cannot find module './NNNN.js'" crashes.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || "development",
    NEXT_PUBLIC_SHOW_ENV_BADGE: showEnvBadge,
  },
};

export default nextConfig;
