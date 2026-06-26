import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EditCheckout } from "@/components/attendance/edit-checkout";
import { formatHours } from "@/lib/utils";

const time = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function AdminAttendancePage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("attendance")
    .select("*, profiles!attendance_employee_id_fkey(full_name)")
    .order("work_date", { ascending: false })
    .limit(80);

  return (
    <Card>
      <CardHeader><CardTitle>All attendance</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <THead><TR><TH>Employee</TH><TH>Date</TH><TH>In</TH><TH>Out</TH><TH>Hours</TH><TH>Deficit/Extra</TH><TH>Edit</TH></TR></THead>
          <TBody>
            {(rows ?? []).map((r: any) => {
              const open = r.check_in_time && !r.check_out_time;
              return (
                <TR key={r.id}>
                  <TD>{r.profiles?.full_name}</TD>
                  <TD className="tabular">{r.work_date}{r.is_edited && <Badge tone="neutral" className="ml-2">edited</Badge>}</TD>
                  <TD className="tabular">{time(r.check_in_time)}</TD>
                  <TD className="tabular">{open ? <Badge tone="danger">open</Badge> : time(r.check_out_time)}</TD>
                  <TD className="tabular">{formatHours(r.total_hours)}</TD>
                  <TD>
                    {Number(r.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(r.deficit_hours)}</Badge>}
                    {Number(r.extra_hours) > 0 && <Badge tone="success">+{formatHours(r.extra_hours)}</Badge>}
                  </TD>
                  <TD><EditCheckout attendanceId={r.id} workDate={r.work_date} requireReason /></TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
