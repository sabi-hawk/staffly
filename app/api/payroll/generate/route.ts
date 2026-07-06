import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePayroll } from "@/lib/services/payroll";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS restricts payroll_runs writes to payroll.manage holders; this is the friendly guard (FRD-08).
  if (!(await supabase.rpc("auth_has_perm", { p_perm: "payroll.manage" })).data)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (!body.from || !body.to)
    return NextResponse.json({ error: "from, to required" }, { status: 400 });

  try {
    const runs = await generatePayroll(supabase, { from: body.from, to: body.to, generatedBy: user.id });
    return NextResponse.json({ runs });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
