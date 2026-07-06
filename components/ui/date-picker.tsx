"use client";
// Modern date / date-time pickers (react-day-picker + Radix popover) — the platform standard
// replacing every native <input type="date|datetime-local"> (owner, 2026-07-07).
// Values stay STRINGS ("YYYY-MM-DD" / "YYYY-MM-DDTHH:mm") so call sites are drop-in.
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/crm/info-hint";

// Floating label for pickers (platform field convention): rests after the calendar icon,
// floats onto the top border on focus / when a date is chosen.
function PickerLabel({ label, hint, htmlFor }: { label: string; hint?: string; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "pointer-events-none absolute z-[1] flex max-w-[80%] items-center gap-1 truncate bg-white px-1 transition-all duration-150",
        "left-8 top-1/2 -translate-y-1/2 text-sm text-text-secondary/80",
        "group-focus-within:left-2 group-focus-within:top-0 group-focus-within:text-[11px] group-focus-within:font-medium group-focus-within:text-brand-primary",
        "group-data-[filled=true]:left-2 group-data-[filled=true]:top-0 group-data-[filled=true]:text-[11px] group-data-[filled=true]:font-medium"
      )}
    >
      <span className="truncate">{label}</span>
      {hint && (
        <span className="pointer-events-auto">
          <InfoHint text={hint} label={label} />
        </span>
      )}
    </label>
  );
}

// ---- string <-> Date (local wall-clock; never UTC-parse a date-only string) ----
function parseDate(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const [d, t] = s.split("T");
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return undefined;
  const [hh = 0, mm = 0] = (t ?? "").split(":").map(Number);
  return new Date(y, m - 1, day, hh || 0, mm || 0);
}
function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const fmt = (d: Date) => d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

function Calendar({
  selected,
  onSelect,
  min,
  max,
}: {
  selected?: Date;
  onSelect: (d?: Date) => void;
  min?: string;
  max?: string;
}) {
  const disabled = [
    ...(min ? [{ before: parseDate(min)! }] : []),
    ...(max ? [{ after: parseDate(max)! }] : []),
  ];
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      defaultMonth={selected}
      disabled={disabled.length ? disabled : undefined}
      showOutsideDays
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      classNames={{
        root: "rdp-root p-3",
        months: "relative",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-semibold text-text-primary",
        nav: "absolute inset-x-1 top-0 z-10 flex h-8 items-center justify-between",
        button_previous: "flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary",
        button_next: "flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 pb-1 text-center text-[11px] font-medium uppercase text-text-secondary",
        week: "flex",
        day: "p-0.5 text-center",
        day_button:
          "flex size-8 items-center justify-center rounded-md text-sm text-text-primary transition-colors hover:bg-surface aria-selected:hover:bg-brand-primary",
        selected: "[&>button]:bg-brand-primary [&>button]:text-white [&>button]:font-semibold",
        today: "[&>button]:ring-1 [&>button]:ring-brand-primary/50 font-semibold",
        outside: "[&>button]:text-text-secondary/50",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-35",
      }}
    />
  );
}

function Trigger({
  id,
  filled,
  placeholder,
  children,
  disabled,
  className,
}: {
  id?: string;
  filled: boolean;
  placeholder: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <PopoverPrimitive.Trigger
      id={id}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-md border border-border bg-white px-3 text-left text-sm transition-colors",
        "hover:border-brand-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        filled ? "text-text-primary" : "text-text-secondary/70",
        className
      )}
    >
      <CalendarIcon className="size-4 shrink-0 text-text-secondary" />
      <span className="truncate">{filled ? children : placeholder}</span>
    </PopoverPrimitive.Trigger>
  );
}

function Content({ children }: { children: React.ReactNode }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align="start"
        sideOffset={6}
        className="z-50 rounded-xl border border-border bg-card shadow-soft focus:outline-none"
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

/** Date picker. `value`/`onChange` use "YYYY-MM-DD" strings (drop-in for input[type=date]).
 * Pass `label` (+ optional `hint`) to render the platform floating label instead of a placeholder. */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  label,
  hint,
  min,
  max,
  disabled,
  className,
}: {
  value?: string;
  onChange: (v: string) => void;
  id?: string;
  placeholder?: string;
  label?: string;
  hint?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const date = parseDate(value);
  const picker = (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Trigger id={id} filled={!!date} placeholder={label ? "" : placeholder} disabled={disabled} className={cn(label && "h-10", className)}>
        {date ? fmt(date) : null}
      </Trigger>
      <Content>
        <Calendar
          selected={date}
          min={min}
          max={max}
          onSelect={(d) => {
            if (d) onChange(toDateString(d));
            setOpen(false);
          }}
        />
      </Content>
    </PopoverPrimitive.Root>
  );
  if (!label) return picker;
  return (
    <div className="group relative" data-filled={!!date}>
      {picker}
      <PickerLabel label={label} hint={hint} htmlFor={id} />
    </div>
  );
}

/** Date-time picker. `value`/`onChange` use "YYYY-MM-DDTHH:mm" (drop-in for input[type=datetime-local]).
 * Pass `label` (+ optional `hint`) to render the platform floating label instead of a placeholder. */
export function DateTimePicker({
  value,
  onChange,
  id,
  placeholder = "Pick date & time",
  label,
  hint,
  disabled,
  className,
}: {
  value?: string;
  onChange: (v: string) => void;
  id?: string;
  placeholder?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const date = parseDate(value);
  const time = value?.split("T")[1]?.slice(0, 5) ?? "";
  const setParts = (dstr?: string, tstr?: string) => {
    const dPart = dstr ?? (date ? toDateString(date) : "");
    if (!dPart) return;
    onChange(`${dPart}T${tstr ?? (time || "12:00")}`);
  };
  const picker = (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Trigger id={id} filled={!!date} placeholder={label ? "" : placeholder} disabled={disabled} className={cn(label && "h-10", className)}>
        {date ? `${fmt(date)}${time ? ` · ${time}` : ""}` : null}
      </Trigger>
      <Content>
        <Calendar selected={date} onSelect={(d) => d && setParts(toDateString(d))} />
        <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
          <Clock className="size-4 text-text-secondary" />
          <input
            type="time"
            value={time}
            onChange={(e) => setParts(undefined, e.target.value)}
            className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-primary/90"
          >
            Done
          </button>
        </div>
      </Content>
    </PopoverPrimitive.Root>
  );
  if (!label) return picker;
  return (
    <div className="group relative" data-filled={!!date}>
      {picker}
      <PickerLabel label={label} hint={hint} htmlFor={id} />
    </div>
  );
}
