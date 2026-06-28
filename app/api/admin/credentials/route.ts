import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleOf } from "@/lib/auth";

// Admin/super-admin: set an employee's username and/or reset their portal password.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "super_admin"].includes((await roleOf(supabase, user.id)) ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { employeeId, username, password } = body;
  if (!employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });

  const admin = createAdminClient();

  if (typeof username === "string" && username.trim()) {
    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(uname))
      return NextResponse.json({ error: "Username: 3-40 chars, letters/numbers/._-" }, { status: 400 });
    const { error } = await supabase.from("profiles").update({ username: uname }).eq("id", employeeId);
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Username already taken" : error.message }, { status: 400 });
  }

  if (typeof password === "string" && password) {
    if (password.length < 6) return NextResponse.json({ error: "Password too short" }, { status: 400 });
    const { error: pwErr } = await admin.auth.admin.updateUserById(employeeId, { password });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 });
    // mirror into employee_credentials so admins can view/copy it
    await admin.from("employee_credentials").upsert(
      { employee_id: employeeId, portal_password: password },
      { onConflict: "employee_id" }
    );
  }

  return NextResponse.json({ ok: true });
}
