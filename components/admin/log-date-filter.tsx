"use client";
// Date filter for the (server-rendered) activity-log GET form: renders the modern DatePicker
// and mirrors its value into a hidden input, so the form submits the exact same query param
// (?from / ?to) as the old native <input type="date" name=...> did. Submission still happens
// via the form's Apply button (dates never auto-submitted).
import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";

export function LogDateFilter({
  name,
  defaultValue,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <DatePicker value={value} onChange={setValue} placeholder={placeholder} className={className} />
    </>
  );
}
