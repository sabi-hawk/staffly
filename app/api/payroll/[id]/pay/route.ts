import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setPaymentStatus } from "@/lib/services/payroll";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    const run = await setPaymentStatus(supabase, params.id, {
      status: body.status === "pending" ? "pending" : "paid",
      paidAt: body.paid_at,
      creditedAccount: body.credited_account,
      paidAmount: body.paid_amount,
    });
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
