import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { deleteGoogleConnection } from "@/lib/google/tokens";

export const dynamic = "force-dynamic";

// Disconnect the logged-in user's Google account (removes their stored tokens).
export async function POST() {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteGoogleConnection(me.id);
  return NextResponse.json({ ok: true });
}
