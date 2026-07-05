// Deterministic, pleasant colour per BD (from their id) — used to colour their bookings on the shared
// CRM calendar. Plain module (server + client). Returns inline HSL styles (Tailwind can't do dynamic hues).
export function bdColor(id: string | null | undefined) {
  // Full 32-bit rolling hash, then map through the golden angle (137.508°) so even near-identical ids
  // (our seed UUIDs differ by one digit) land on well-separated hues.
  let sum = 0;
  for (const ch of id ?? "anon") sum = (Math.imul(sum, 131) + ch.charCodeAt(0)) >>> 0;
  const h = Math.round((sum * 137.508) % 360);
  return {
    hue: h,
    border: `hsl(${h} 55% 45%)`,
    bg: `hsl(${h} 70% 96%)`,
    text: `hsl(${h} 45% 32%)`,
    dot: `hsl(${h} 55% 45%)`,
  };
}
