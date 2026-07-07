"use client";
// Shared Radix Select dropdown pieces so every custom select on the platform opens BELOW the field
// (native <select> centres its popup over the field on macOS — owner feedback 2026-07-08) and is
// fully stylable. Used by FloatSelect and the stack combobox.
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Radix reserves the empty string as the "no value" sentinel and throws on <Item value="">. Map our
// empty-string option values (All / Not set / Me / Unassigned) to a private token and back.
export const EMPTY = "⁣__empty__";
export const toRadix = (v: string) => (v === "" ? EMPTY : v);
export const fromRadix = (v: string) => (v === EMPTY ? "" : v);

export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className={cn(
          "z-50 max-h-[300px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-card shadow-soft",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          className
        )}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return (
    <SelectPrimitive.Item
      value={value}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-3 pr-8 text-sm text-text-primary outline-none",
        "data-[highlighted]:bg-surface data-[state=checked]:font-medium data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center">
        <Check className="size-4 text-brand-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
