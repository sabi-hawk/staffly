import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { avatarUrl, formatCode } from "@/lib/utils";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string };
}) {
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  const { data: people, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "employee") // admins/super-admins are not listed as employees
    .order("full_name", { ascending: true })
    .range(from, to);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees ({count ?? 0})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Code</TH><TH>Name</TH><TH>Role</TH><TH>Designation</TH>
              <TH>Department</TH><TH>Type</TH><TH>Status</TH><TH></TH>
            </TR>
          </THead>
          <TBody>
            {(people ?? []).map((p) => (
              <TR key={p.id} className="cursor-pointer">
                <TD className="tabular text-text-secondary">{formatCode(p.employee_code)}</TD>
                <TD>
                  <Link href={`/admin/employees/${p.id}`} className="flex items-center gap-2.5 font-medium text-text-primary hover:text-brand-primary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl(p.avatar_url, p.gender)} alt="" className="h-7 w-7 rounded-full object-cover" />
                    {p.full_name}
                  </Link>
                </TD>
                <TD className="capitalize">{p.role.replace("_", " ")}</TD>
                <TD>{p.position ?? "—"}</TD>
                <TD>{p.department ?? "—"}</TD>
                <TD className="capitalize">{p.employment_type}</TD>
                <TD><Badge tone={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge></TD>
                <TD className="text-right">
                  <Link href={`/admin/employees/${p.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" aria-label="Open">
                    <ChevronRight className="size-4" />
                  </Link>
                </TD>
              </TR>
            ))}
            {(people ?? []).length === 0 && (
              <TR><TD className="py-6 text-center text-text-secondary">No employees found.</TD></TR>
            )}
          </TBody>
        </Table>
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
      </CardContent>
    </Card>
  );
}
