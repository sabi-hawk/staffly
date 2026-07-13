import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, sessionHasPerm } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { requireDangerForSuper } from "@/lib/danger";
import { updatePayrollRun } from "@/lib/services/payroll";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollManage)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  try {
    const run = await updatePayrollRun(supabase, params.id, body);
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// Delete a DRAFT payroll run (its payslip lines cascade). A finalised run must be reopened first, so a
// locked payslip can't be silently destroyed. Danger-guarded (super-admin financial hard delete).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollManage)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const gate = requireDangerForSuper(request, me.role); if (gate) return gate;

  const { data: run } = await supabase.from("payroll_runs").select("status").eq("id", params.id).maybeSingle();
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (run.status === "finalised")
    return NextResponse.json({ error: "Reopen this payslip before deleting it." }, { status: 400 });

  const { error } = await supabase.from("payroll_runs").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
