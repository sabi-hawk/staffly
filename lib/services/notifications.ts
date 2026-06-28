// Admin notifications: probation-ended, payslip reminder (25th+), upcoming birthdays.
// Idempotent via dedup_key. Generated on admin dashboard load (and could be a cron too).
import type { SupabaseClient } from "@supabase/supabase-js";
import { probationEnd } from "@/lib/services/leaves";
import { companyToday } from "@/lib/time";

function daysUntilBirthday(dob: string, now: Date): number {
  const b = new Date(dob);
  const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
}

/** Compute + upsert admin notifications. Safe to call repeatedly (dedup_key unique). */
export async function refreshAdminNotifications(supabase: SupabaseClient) {
  const now = new Date();
  const rows: { type: string; message: string; severity: string; dedup_key: string; link?: string }[] = [];

  const { data: emps } = await supabase
    .from("profiles")
    .select("id, full_name, contract_type, joining_date, date_of_birth")
    .eq("role", "employee").eq("status", "active");

  for (const e of emps ?? []) {
    // probation ended
    if (e.contract_type === "probation" && e.joining_date) {
      const pe = probationEnd(e.joining_date);
      if (pe && pe <= now) {
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
      const d = daysUntilBirthday(e.date_of_birth, now);
      if (d <= 7) {
        rows.push({
          type: "birthday",
          message: d === 0 ? `🎂 ${e.full_name}'s birthday is today!` : `🎂 ${e.full_name}'s birthday is in ${d} day(s).`,
          severity: "info",
          dedup_key: `birthday:${e.id}:${now.getFullYear()}`,
          link: `/admin/employees/${e.id}`,
        });
      }
    }
  }

  // payslip reminder from the 25th
  if (now.getDate() >= 25) {
    const month = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    rows.push({
      type: "payslip_reminder",
      message: `It's time to compile and generate payslips for ${month}.`,
      severity: "warning",
      dedup_key: `payslip_reminder:${now.getFullYear()}-${now.getMonth() + 1}`,
      link: `/admin/payroll`,
    });
  }

  if (rows.length) {
    await supabase.from("admin_notifications").upsert(rows, { onConflict: "dedup_key", ignoreDuplicates: true });
  }
  void companyToday;
}

export async function getAdminNotifications(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("admin_notifications").select("*").is("resolved_at", null)
    .order("created_at", { ascending: false }).limit(20);
  return data ?? [];
}
