import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleOf } from "@/lib/auth";

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
}

// Admin/super-admin: onboard a new employee — creates the auth login + profile + shift +
// salary row + portal credentials, auto-generating a 4-digit code, username, and password.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "super_admin"].includes((await roleOf(supabase, user.id)) ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const full_name = (b.full_name || "").trim();
  const email = (b.email || "").trim().toLowerCase();
  if (!full_name || !email) return NextResponse.json({ error: "Full name and email are required" }, { status: 400 });

  const admin = createAdminClient();

  // unique 4-digit employee code
  let code = "";
  for (let i = 0; i < 20; i++) {
    const candidate = String(1000 + Math.floor(Math.random() * 9000));
    const { data } = await admin.from("profiles").select("id").eq("employee_code", candidate).maybeSingle();
    if (!data) { code = candidate; break; }
  }
  if (!code) return NextResponse.json({ error: "Could not allocate an employee code" }, { status: 500 });

  // unique username first.last
  const parts = full_name.split(/\s+/).filter(Boolean);
  const baseUser = parts.length > 1 ? `${slug(parts[0])}.${slug(parts[parts.length - 1])}` : slug(parts[0] || "user");
  let username = baseUser;
  for (let n = 1; n < 50; n++) {
    const { data } = await admin.from("profiles").select("id").ilike("username", username).maybeSingle();
    if (!data) break;
    username = `${baseUser}${n}`;
  }

  const password = `Softonoma@${code}`;

  // create the auth user (login email = primary email)
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: "employee" },
  });
  if (created.error) {
    const msg = /registered|exists/i.test(created.error.message) ? "An account with this email already exists" : created.error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const id = created.data.user.id;

  // fill the profile (handle_new_user already inserted a base row)
  const { error: pErr } = await admin.from("profiles").update({
    full_name,
    username,
    employee_code: code,
    email_secondary: b.email_secondary || null,
    phone: b.phone || null,
    gender: b.gender || null,
    position: b.position || null,
    department: b.department || null,
    employment_type: b.employment_type === "remote" ? "remote" : "onsite",
    joining_date: b.joining_date || null,
    status: "active",
  }).eq("id", id);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  // private PII (CNIC) if provided
  if (b.cnic) await admin.from("employee_private").upsert({ employee_id: id, cnic: b.cnic }, { onConflict: "employee_id" });

  // base salary
  await admin.from("salary_structures").insert({ employee_id: id, base_salary: Number(b.base_salary) || 0, currency: "PKR" });

  // default shift (Mon–Fri 10:00–19:00, 90m buffer)
  await admin.from("shifts").insert({
    employee_id: id, start_time: "10:00", end_time: "19:00",
    days_of_week: [1, 2, 3, 4, 5], checkin_buffer_minutes: 90, is_active: true,
  });

  // leave balance row for the current year/month
  const now = new Date();
  await admin.from("leave_balances").insert({
    employee_id: id, year: now.getFullYear(), annual_total: 8, annual_used: 0,
    casual_month: now.getMonth() + 1, casual_used: 0,
  });

  // portal credentials (viewable/copyable by admins)
  await admin.from("employee_credentials").upsert({ employee_id: id, portal_password: password }, { onConflict: "employee_id" });

  return NextResponse.json({ id, username, code, password });
}
