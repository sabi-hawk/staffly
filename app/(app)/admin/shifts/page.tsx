import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { shiftDurationHours } from "@/lib/hours";
import { formatHours } from "@/lib/utils";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function ShiftsPage() {
  const supabase = createClient();
  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, profiles!shifts_employee_id_fkey(full_name)")
    .eq("is_active", true)
    .order("start_time");

  return (
    <Card>
      <CardHeader><CardTitle>Shifts</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <THead><TR><TH>Employee</TH><TH>Start</TH><TH>End</TH><TH>Duration</TH><TH>Days</TH><TH>Buffer</TH></TR></THead>
          <TBody>
            {(shifts ?? []).map((s: any) => (
              <TR key={s.id}>
                <TD>{s.profiles?.full_name}</TD>
                <TD className="tabular">{s.start_time}</TD>
                <TD className="tabular">{s.end_time}</TD>
                <TD className="tabular">{formatHours(shiftDurationHours(s.start_time, s.end_time))}</TD>
                <TD>{s.days_of_week.map((d: number) => DOW[d]).join(", ")}</TD>
                <TD className="tabular">{s.checkin_buffer_minutes}m</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
