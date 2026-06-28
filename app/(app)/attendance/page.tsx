import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { companyToday } from "@/lib/time";
import { CheckWidget } from "@/components/attendance/check-widget";
import { EditAttendance } from "@/components/attendance/edit-attendance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";
import { workLogPreview } from "@/components/work-log-editor";

const time = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function AttendancePage() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const today = companyToday();

  const { data: todayRow } = await supabase
    .from("attendance").select("*").eq("employee_id", profile.id).eq("work_date", today).maybeSingle();

  const { data: history } = await supabase
    .from("attendance").select("*").eq("employee_id", profile.id)
    .order("work_date", { ascending: false }).limit(30);

  return (
    <div className="space-y-6">
      <CheckWidget today={todayRow as any} />
      <Card>
        <CardHeader><CardTitle>Attendance history</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>In</TH><TH>Out</TH><TH>Hours</TH><TH>Deficit/Extra</TH><TH>Log</TH><TH></TH></TR>
            </THead>
            <TBody>
              {(history ?? []).map((r) => {
                const open = r.check_in_time && !r.check_out_time;
                return (
                  <TR key={r.id}>
                    <TD className="tabular">{r.work_date}{r.is_edited && <Badge tone="neutral" className="ml-2">edited</Badge>}</TD>
                    <TD className="tabular">{time(r.check_in_time)}</TD>
                    <TD className="tabular">{open ? <Badge tone="danger">open</Badge> : time(r.check_out_time)}</TD>
                    <TD className="tabular">{formatHours(r.total_hours)}</TD>
                    <TD>
                      {Number(r.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(r.deficit_hours)}</Badge>}
                      {Number(r.extra_hours) > 0 && <Badge tone="success">+{formatHours(r.extra_hours)}</Badge>}
                    </TD>
                    <TD className="max-w-[200px] truncate text-text-secondary">{workLogPreview(r.work_log) || "—"}</TD>
                    <TD>{r.work_date === today && r.check_in_time && (
                      <EditAttendance
                        attendanceId={r.id}
                        workDate={r.work_date}
                        checkInTime={r.check_in_time}
                        checkOutTime={r.check_out_time}
                        mode="employee"
                      />
                    )}</TD>
                  </TR>
                );
              })}
              {(history ?? []).length === 0 && (
                <TR><TD className="py-6 text-center text-text-secondary">No records yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
