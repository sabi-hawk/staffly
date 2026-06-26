import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format hours like 8.83 → "8h 50m". */
export function formatHours(h: number | null | undefined): string {
  if (h == null) return "—";
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole}h`;
  return `${whole}h ${mins}m`;
}

/** Format money in PKR. */
export function formatPKR(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Resolve an avatar URL: uploaded image, else a gender-based default. */
export function avatarUrl(
  url: string | null | undefined,
  gender?: string | null
): string {
  if (url) return url;
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m") return "/avatars/male.svg";
  if (g === "female" || g === "f") return "/avatars/female.svg";
  return "/avatars/neutral.svg";
}

/** Format a "HH:MM[:SS]" 24h time as "h:MM AM/PM". */
export function formatTime12(t: string | null | undefined): string {
  if (!t) return "—";
  const [hStr, m = "00"] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.padStart(2, "0")} ${ampm}`;
}

/** A 4-digit employee-code string from a number. */
export function formatCode(code: string | number | null | undefined): string {
  return code == null ? "—" : `#${code}`;
}
