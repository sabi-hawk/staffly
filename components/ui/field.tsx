"use client";
// ── THE platform field convention (owner, 2026-07-07) ─────────────────────────
// Floating-label fields: the label sits inside the control when empty; on focus
// or when filled it floats up onto the top border (small, brand-coloured while
// focused) with a white notch cut into the border. Every form field on the
// platform uses these — FloatInput / FloatTextarea / FloatSelect — or wraps a
// custom control (DatePicker, FileInput, combobox) in <FloatShell>. Field info
// tooltips (InfoHint) ride along the label and stay hoverable in both states.
// Do NOT introduce plain <Label> + <Input> stacks in new forms.
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/crm/info-hint";
import { SelectContent, SelectItem, toRadix, fromRadix } from "@/components/ui/select-content";

// label positioning shared by all variants: centred when resting, floated when
// the control is focused or filled (data-filled on the wrapper).
// NOTE: no `truncate` here — overflow-hidden on the label would clip the InfoHint tooltip;
// only the inner text span truncates.
const LABEL_BASE =
  "pointer-events-none absolute left-2.5 z-[1] flex max-w-[85%] items-center gap-1 bg-white px-1 transition-all duration-150";
const LABEL_RESTING = "top-1/2 -translate-y-1/2 text-sm text-text-secondary/80";
const LABEL_FLOATED =
  "group-focus-within:top-0 group-focus-within:text-[11px] group-focus-within:font-medium group-focus-within:text-brand-primary " +
  "group-data-[filled=true]:top-0 group-data-[filled=true]:text-[11px] group-data-[filled=true]:font-medium";

function FloatLabel({ label, hint, htmlFor }: { label: string; hint?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn(LABEL_BASE, LABEL_RESTING, LABEL_FLOATED)}>
      <span className="truncate">{label}</span>
      {hint && (
        <span className="pointer-events-auto">
          <InfoHint text={hint} label={label} />
        </span>
      )}
    </label>
  );
}

const CONTROL =
  "h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-text-primary transition-colors " +
  "hover:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/70 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/** Floating-label text input. */
export const FloatInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder"> & { label: string; hint?: string; wrapClassName?: string }
>(({ label, hint, className, wrapClassName, id, value, defaultValue, ...props }, ref) => {
  const filled = value !== undefined ? String(value ?? "").length > 0 : undefined;
  return (
    <div
      className={cn("group relative", wrapClassName)}
      data-filled={filled ?? undefined}
      // uncontrolled inputs: track fill via CSS :placeholder-shown fallback below
    >
      <input
        ref={ref}
        id={id}
        value={value}
        defaultValue={defaultValue}
        placeholder=" "
        className={cn(CONTROL, "peer placeholder-transparent", className)}
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          LABEL_BASE,
          LABEL_RESTING,
          LABEL_FLOATED,
          // uncontrolled fallback: float whenever the input has content
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
        )}
      >
        <span className="truncate">{label}</span>
        {hint && (
          <span className="pointer-events-auto">
            <InfoHint text={hint} label={label} />
          </span>
        )}
      </label>
    </div>
  );
});
FloatInput.displayName = "FloatInput";

/** Floating-label textarea. */
export const FloatTextarea = React.forwardRef<
  HTMLTextAreaElement,
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder"> & { label: string; hint?: string; wrapClassName?: string }
>(({ label, hint, className, wrapClassName, id, value, defaultValue, rows = 3, ...props }, ref) => {
  return (
    <div className={cn("group relative", wrapClassName)}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        placeholder=" "
        className={cn(CONTROL, "peer h-auto min-h-[76px] py-2.5 placeholder-transparent", className)}
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          LABEL_BASE,
          "top-4 text-sm text-text-secondary/80",
          "peer-focus:top-0 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand-primary",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
        )}
      >
        <span className="truncate">{label}</span>
        {hint && (
          <span className="pointer-events-auto">
            <InfoHint text={hint} label={label} />
          </span>
        )}
      </label>
    </div>
  );
});
FloatTextarea.displayName = "FloatTextarea";

/** Floating-label select built on Radix Select so the list opens BELOW the field (native <select>
 * centres its popup over the field on macOS). Keeps the familiar <option>-children + onChange API,
 * so callers are unchanged. The label ALWAYS floats (a select always shows a value). */
type OptionData = { value: string; label: React.ReactNode; disabled?: boolean };
function readOptions(children: React.ReactNode): OptionData[] {
  const out: OptionData[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== "option") return;
    const p = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
    out.push({ value: String(p.value ?? ""), label: p.children, disabled: p.disabled });
  });
  return out;
}

export const FloatSelect = React.forwardRef<
  HTMLButtonElement,
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
    label: string;
    hint?: string;
    wrapClassName?: string;
    onChange?: (e: { target: { value: string } }) => void;
  }
>(({ label, hint, className, wrapClassName, id, value, defaultValue, children, onChange, disabled, required, name, ...props }, ref) => {
  const options = readOptions(children);
  const controlled = value !== undefined;
  return (
    <div className={cn("group relative", wrapClassName)} data-filled="true">
      <SelectPrimitive.Root
        value={controlled ? toRadix(String(value)) : undefined}
        defaultValue={defaultValue !== undefined ? toRadix(String(defaultValue)) : undefined}
        onValueChange={(v) => onChange?.({ target: { value: fromRadix(v) } })}
        disabled={disabled}
        required={required}
        name={name}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          aria-label={(props as { "aria-label"?: string })["aria-label"] ?? label}
          className={cn(CONTROL, "flex items-center justify-between gap-2 pr-3 text-left", className)}
        >
          <span className="truncate"><SelectPrimitive.Value /></span>
          <SelectPrimitive.Icon>
            <ChevronDown className="size-[18px] shrink-0 text-text-secondary/70" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={toRadix(o.value)} className={o.disabled ? "pointer-events-none opacity-50" : undefined}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive.Root>
      <FloatLabel label={label} hint={hint} htmlFor={id} />
    </div>
  );
});
FloatSelect.displayName = "FloatSelect";

/** Compact native <select> for filters and utility controls (rows-per-page, toolbar filters) where a
 * floating label would be overkill. Same custom chevron (gap from the wall, refined colour) as
 * FloatSelect, so no browser-default arrow ever touches the right border. */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { wrapClassName?: string }
>(({ className, wrapClassName, children, ...props }, ref) => (
  <span className={cn("relative inline-flex items-center", wrapClassName)}>
    <select
      ref={ref}
      className={cn(
        "h-9 appearance-none rounded-md border border-border bg-white pl-3 pr-8 text-sm text-text-primary",
        "transition-colors hover:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/70",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 size-[18px] text-text-secondary/70" />
  </span>
));
NativeSelect.displayName = "NativeSelect";

/** Floating-label wrapper for custom controls (DatePicker, FileInput, comboboxes).
 * Pass `filled` so the label knows when to stay floated; the child control should
 * render NO placeholder of its own. */
export function FloatShell({
  label,
  hint,
  filled,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  filled: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("group relative", className)} data-filled={filled}>
      {children}
      <FloatLabel label={label} hint={hint} htmlFor={htmlFor} />
    </div>
  );
}
