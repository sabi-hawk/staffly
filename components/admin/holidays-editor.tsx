"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export function HolidaysEditor({ holidays }: { holidays: { id: string; name: string; holiday_date: string; year: number }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !date) return toast.error("Name and date required");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("holidays").insert({ name, holiday_date: date, year: new Date(date).getFullYear() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Holiday added");
    setName(""); setDate("");
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Table>
        <THead><TR><TH>Name</TH><TH>Date</TH><TH>Year</TH><TH></TH></TR></THead>
        <TBody>
          {holidays.map((h) => (
            <TR key={h.id}>
              <TD>{h.name}</TD>
              <TD className="tabular">{h.holiday_date}</TD>
              <TD className="tabular">{h.year}</TD>
              <TD className="text-right">
                <button onClick={() => remove(h.id)} className="text-text-secondary hover:text-danger" aria-label="Remove"><Trash2 className="size-4" /></button>
              </TD>
            </TR>
          ))}
          {holidays.length === 0 && <TR><TD className="py-6 text-center text-text-secondary">No holidays defined.</TD></TR>}
        </TBody>
      </Table>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
        <div className="space-y-1.5"><Label>Holiday name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eid" /></div>
        <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <Button type="submit" disabled={busy}><Plus className="size-4" /> Add holiday</Button>
      </form>
    </div>
  );
}
