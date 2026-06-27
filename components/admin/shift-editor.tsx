"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatTime12 } from "@/lib/utils";
import { shiftDurationHours } from "@/lib/hours";
import { formatHours } from "@/lib/utils";

const DOW = [
  { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" }, { v: 4, l: "Thu" },
  { v: 5, l: "Fri" }, { v: 6, l: "Sat" }, { v: 0, l: "Sun" },
];

interface Shift {
  id?: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  checkin_buffer_minutes: number;
}

export function ShiftEditor({ employeeId, shift }: { employeeId: string; shift: Shift | null }) {
  const router = useRouter();
  const [start, setStart] = useState((shift?.start_time ?? "10:00").slice(0, 5));
  const [end, setEnd] = useState((shift?.end_time ?? "19:00").slice(0, 5));
  const [days, setDays] = useState<number[]>(shift?.days_of_week ?? [1, 2, 3, 4, 5]);
  const [buffer, setBuffer] = useState(shift?.checkin_buffer_minutes ?? 90);
  const [busy, setBusy] = useState(false);

  function toggleDay(v: number) {
    setDays((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v].sort()));
  }

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const row = {
      employee_id: employeeId,
      start_time: start,
      end_time: end,
      days_of_week: days,
      checkin_buffer_minutes: buffer,
      is_active: true,
    };
    const { error } = shift?.id
      ? await supabase.from("shifts").update(row).eq("id", shift.id)
      : await supabase.from("shifts").insert(row);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Shift saved");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Start time</Label>
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <p className="text-caption text-text-secondary">{formatTime12(start)}</p>
        </div>
        <div className="space-y-1.5">
          <Label>End time</Label>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          <p className="text-caption text-text-secondary">{formatTime12(end)}</p>
        </div>
        <div className="space-y-1.5">
          <Label>Check-in buffer (min)</Label>
          <Input type="number" value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Working days</Label>
        <div className="flex flex-wrap gap-1.5">
          {DOW.map((d) => (
            <button
              key={d.v}
              type="button"
              onClick={() => toggleDay(d.v)}
              className={`rounded-md border px-3 py-1.5 text-caption font-medium ${
                days.includes(d.v) ? "border-brand-primary bg-brand-light text-brand-primary" : "border-border text-text-secondary"
              }`}
            >
              {d.l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-caption text-text-secondary">
          {formatTime12(start)} – {formatTime12(end)} · {formatHours(shiftDurationHours(start, end))}/day
        </p>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save shift"}</Button>
      </div>
    </div>
  );
}
