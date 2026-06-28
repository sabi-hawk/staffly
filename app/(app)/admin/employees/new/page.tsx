import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AddEmployeeForm } from "@/components/admin/add-employee-form";

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <Link href="/admin/employees" className="inline-flex items-center gap-1.5 text-caption font-medium text-text-secondary hover:text-brand-primary">
        <ArrowLeft className="size-4" /> Back to employees
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Add employee</CardTitle>
          <CardDescription>Creates the employee's login, profile, default shift, salary, and credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddEmployeeForm />
        </CardContent>
      </Card>
    </div>
  );
}
