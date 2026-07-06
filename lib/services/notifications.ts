// Admin notifications: probation-ended, payslip reminder (25th+), upcoming birthdays.
// Idempotent via dedup_key. Generated on admin dashboard load (and could be a cron too).
// All "what day is it" math uses the company day (Asia/Karachi), not server-local time.
import type { SupabaseClient } from "@supabase/supabase-js";
import { probationEnd } from "@/lib/services/leaves";
import { companyToday } from "@/lib/time";

/** Days from `todayISO` (YYYY-MM-DD) until the next occurrence of dob's month/day. */
function daysUntilBirthday(dob: string, todayISO: string): number {
  const [y, m, d] = todayISO.split("-").map(Number);
  const b = new Date(dob);
  const today = Date.UTC(y, m - 1, d);
  let next = Date.UTC(y, b.getUTCMonth(), b.getUTCDate());
  if (next < today) next = Date.UTC(y + 1, b.getUTCMonth(), b.getUTCDate());
  return Math.round((next - today) / 86400000);
}

/** Compute + upsert admin notifications. Safe to call repeatedly (dedup_key unique). */
export async function refreshAdminNotifications(supabase: SupabaseClient) {
  const today = companyToday(); // YYYY-MM-DD in Asia/Karachi
  const [year, month, day] = today.split("-").map(Number);
  const rows: { type: string; message: string; severity: string; dedup_key: string; link?: string }[] = [];

  const { data: emps } = await supabase
    .from("profiles")
    .select("id, full_name, contract_type, joining_date, date_of_birth")
    .eq("role", "employee").eq("status", "active");

  for (const e of emps ?? []) {
    // probation ended
    if (e.contract_type === "probation" && e.joining_date) {
      const pe = probationEnd(e.joining_date);
      if (pe && pe.toISOString().slice(0, 10) <= today) {
        rows.push({
          type: "probation_ended",
          message: `${e.full_name}'s probation ended on ${pe.toISOString().slice(0, 10)} — review for permanent.`,
          severity: "warning",
          dedup_key: `probation_ended:${e.id}`,
          link: `/admin/employees/${e.id}`,
        });
      }
    }
    // upcoming birthday (within 7 days)
    if (e.date_of_birth) {
      const d = daysUntilBirthday(e.date_of_birth, today);
      if (d <= 7) {
        rows.push({
          type: "birthday",
          message: d === 0 ? `🎂 ${e.full_name}'s birthday is today!` : `🎂 ${e.full_name}'s birthday is in ${d} day(s).`,
          severity: "info",
          dedup_key: `birthday:${e.id}:${year}`,
          link: `/admin/employees/${e.id}`,
        });
      }
    }
  }

  // payslip reminder from the 25th (company calendar)
  if (day >= 25) {
    const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    rows.push({
      type: "payslip_reminder",
      message: `It's time to compile and generate payslips for ${monthLabel}.`,
      severity: "warning",
      dedup_key: `payslip_reminder:${year}-${month}`,
      link: `/admin/payroll`,
    });
  }

  if (rows.length) {
    await supabase.from("admin_notifications").upsert(rows, { onConflict: "dedup_key", ignoreDuplicates: true });
  }
}

export async function getAdminNotifications(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("admin_notifications").select("*").is("resolved_at", null)
    .order("created_at", { ascending: false }).limit(20);
  return data ?? [];
}
