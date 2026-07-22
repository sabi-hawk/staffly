// Build a Google Calendar "create event" URL (action=TEMPLATE). One click opens a prefilled event the
// user reviews and saves — no Google API, OAuth, or secrets. Times display in Asia/Karachi (via ctz).
//
// LIMITATION: this URL form supports title, start/end, timezone, location, a text description, and
// GUESTS (add=email). It does NOT support file attachments — that needs the Google Calendar API + Drive
// (a separate, OAuth-based integration). We surface the lead's documents as links in the description.
const KARACHI = "Asia/Karachi";

// Format a UTC Date as Google's local datetime "YYYYMMDDTHHMMSS" in Karachi wall-clock (pairs with ctz),
// so 18:00 UTC-stored shows as the correct Pakistan time on the event.
function gcalLocal(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KARACHI, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((x) => x.type === t)?.value ?? "00";
  const hh = g("hour") === "24" ? "00" : g("hour"); // Intl can emit "24" at midnight
  return `${g("year")}${g("month")}${g("day")}T${hh}${g("minute")}${g("second")}`;
}

export function googleCalendarEventUrl(opts: {
  title: string;
  startISO: string;         // stored UTC timestamp of the interview
  durationMin?: number;     // default 60
  guests?: (string | null | undefined)[];
  location?: string | null; // meeting link
  details?: string | null;  // description (notes + document links)
}): string {
  const start = new Date(opts.startISO);
  const end = new Date(start.getTime() + (opts.durationMin ?? 60) * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${gcalLocal(start)}/${gcalLocal(end)}`,
    ctz: KARACHI,
  });
  if (opts.location) params.set("location", opts.location);
  if (opts.details) params.set("details", opts.details);
  let url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  // Guests use a repeated &add= param (URLSearchParams can't repeat a key cleanly); de-dupe + skip blanks.
  for (const g of Array.from(new Set((opts.guests ?? []).filter((x): x is string => !!x && x.includes("@"))))) {
    url += `&add=${encodeURIComponent(g)}`;
  }
  return url;
}
