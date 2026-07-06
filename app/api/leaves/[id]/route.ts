import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decideLeave } from "@/lib/services/leaves";
import { sendEmail } from "@/lib/email";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(params.id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  if (body.status !== "approved" && body.status !== "rejected")
    return NextResponse.json({ error: "status must be approved|rejected" }, { status: 400 });

  try {
    const result = await decideLeave(supabase, params.id, user.id, {
      status: body.status,
      note: body.note,
    });

    // Email the requester (reaches closed tabs; console-stubbed until RESEND_API_KEY is set).
    // The in-app notification is created by the DB trigger (0039). Best-effort — never fail the decide.
    try {
      const { data: req } = await supabase
        .from("leave_requests")
        .select("type, start_date, end_date, profiles!leave_requests_employee_id_fkey(email, full_name)")
        .eq("id", params.id)
        .single();
      const emp: any = (req as any)?.profiles;
      if (emp?.email) {
        const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        await sendEmail({
          to: emp.email,
          subject: `Your ${req!.type} leave was ${body.status}`,
          html:
            `<p>Hi ${esc(emp.full_name?.split(" ")[0])},</p>` +
            `<p>Your <strong>${esc(req!.type)}</strong> leave (${req!.start_date}${req!.end_date !== req!.start_date ? ` to ${req!.end_date}` : ""}) was <strong>${body.status}</strong>.` +
            (body.status === "rejected" && body.note ? `<br/>Reason: ${esc(body.note)}` : "") +
            `</p><p>— Softonoma Employee Portal</p>`,
        });
      }
    } catch { /* best-effort */ }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
