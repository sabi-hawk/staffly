import { createClient } from "@/lib/supabase/server";
import { ReportViewer } from "@/components/admin/report-viewer";

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: employees } = await supabase
    .from("profiles").select("id, full_name, employee_code").eq("role", "employee").order("full_name");
  return <ReportViewer employees={employees ?? []} />;
}
