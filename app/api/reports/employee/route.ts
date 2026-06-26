import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildEmployeeReport } from "@/lib/services/reports";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!id || !from || !to)
    return NextResponse.json({ error: "id, from, to required" }, { status: 400 });

  try {
    const report = await buildEmployeeReport(supabase, id, from, to);
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
