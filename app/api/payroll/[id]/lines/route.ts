import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionHasPerm } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { addPayslipLine, removePayslipLine } from "@/lib/services/payroll";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollManage)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (!body.label || body.amount == null)
    return NextResponse.json({ error: "label and amount required" }, { status: 400 });
  try {
    const run = await addPayslipLine(supabase, params.id, {
      label: body.label,
      amount: Number(body.amount),
      kind: body.kind === "deduction" ? "deduction" : "addition",
      description: body.description,
    });
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollManage)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const lineId = searchParams.get("lineId");
  if (!lineId) return NextResponse.json({ error: "lineId required" }, { status: 400 });
  try {
    const run = await removePayslipLine(supabase, lineId, params.id);
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
