"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";

/** Admin: add an approved leave for an employee (also used to convert a missing day). */
export function AddLeave({ employees }: { employees: { id: string; full_name: string; employee_code: string | null }[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [type, setType] = useState("unpaid");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start) return toast.error("From date is required");
    setBusy(true);
    const res = await fetch("/api/admin/leaves", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employeeId, type, start, end: end || start, reason }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success("Leave added");
    setStart(""); setEnd(""); setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <FloatSelect
        id="leave-employee"
        label="Employee"
        hint="The employee the leave is recorded for."
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
      >
        {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}{e.employee_code ? ` (#${e.employee_code})` : ""}</option>)}
      </FloatSelect>
      <FloatSelect
        id="leave-type"
        label="Type"
        hint="Casual and annual are paid and count against the employee's quota. Unpaid is deducted from pay."
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="unpaid">Unpaid</option>
        <option value="casual">Casual (paid)</option>
        <option value="annual">Annual (paid)</option>
      </FloatSelect>
      <DatePicker
        id="leave-start"
        label="From"
        hint="First day of the leave."
        value={start}
        onChange={setStart}
      />
      <DatePicker
        id="leave-end"
        label="To (optional)"
        hint="Last day of the leave. Leave empty to record a single day."
        value={end}
        onChange={setEnd}
      />
      <div className="flex gap-2">
        <FloatInput
          label="Reason"
          hint="Optional note kept on the leave record."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          wrapClassName="flex-1"
        />
        <Button type="submit" disabled={busy}>Add</Button>
      </div>
    </form>
  );
}
