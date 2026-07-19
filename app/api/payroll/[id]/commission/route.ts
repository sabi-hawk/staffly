import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionHasPerm } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { addDealCommissionToRun } from "@/lib/services/payroll";

// GET → the deals this run's employee is on (for the add-commission picker).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollView)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: run } = await supabase.from("payroll_runs").select("employee_id").eq("id", params.id).single();
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const { employeeDealOptions } = await import("@/lib/crm/options");
  const deals = await employeeDealOptions(supabase, run.employee_id);
  return NextResponse.json({ deals });
}

// POST → add a deal commission line to the run (a direct amount, or % of a chosen month's receipts).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollManage)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (!body.deal_id) return NextResponse.json({ error: "deal_id required" }, { status: 400 });
  if (body.amount == null && !body.month) return NextResponse.json({ error: "Provide an amount or a month" }, { status: 400 });
  try {
    const run = await addDealCommissionToRun(supabase, params.id, {
      deal_id: body.deal_id,
      amount: body.amount != null ? Number(body.amount) : undefined,
      month: body.month || undefined,
      label: body.label || undefined,
    });
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
