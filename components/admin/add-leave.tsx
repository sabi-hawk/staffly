"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

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
      <div className="space-y-1.5">
        <Label htmlFor="leave-employee">Employee</Label>
        <select id="leave-employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm">
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}{e.employee_code ? ` (#${e.employee_code})` : ""}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="leave-type">Type</Label>
        <select id="leave-type" value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm">
          <option value="unpaid">Unpaid</option>
          <option value="casual">Casual (paid)</option>
          <option value="annual">Annual (paid)</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="leave-start">From</Label>
        <Input id="leave-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="leave-end">To (optional)</Label>
        <Input id="leave-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Input aria-label="Reason" placeholder="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button type="submit" disabled={busy}>Add</Button>
      </div>
    </form>
  );
}
