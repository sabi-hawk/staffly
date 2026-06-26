import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finalisePayroll } from "@/lib/services/payroll";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const run = await finalisePayroll(supabase, params.id);
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
