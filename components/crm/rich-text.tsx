"use client";
// Minimal rich-text editor (bold / italic / bullet / numbered list). Paste keeps formatting; the HTML
// is sanitized server-side on save. Uncontrolled contenteditable — sets initial HTML once, emits on input.
import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

const PROSE = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-primary [&_a]:underline";

export function RichText({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // seed the editor once (uncontrolled — re-writing innerHTML on every keystroke would move the caret)
  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) ref.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current?.innerHTML ?? "");
  const exec = (cmd: string) => { document.execCommand(cmd, false); ref.current?.focus(); emit(); };

  const btn = "inline-flex size-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary";
  const tool = (cmd: string, label: string, Icon: typeof Bold) => (
    <button type="button" className={btn} title={label} aria-label={label} onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}>
      <Icon className="size-4" />
    </button>
  );

  return (
    <div className="rounded-md border border-border bg-white">
      <div className="flex gap-0.5 border-b border-border px-1 py-1">
        {tool("bold", "Bold", Bold)}
        {tool("italic", "Italic", Italic)}
        {tool("insertUnorderedList", "Bullet list", List)}
        {tool("insertOrderedList", "Numbered list", ListOrdered)}
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={emit}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        className={`min-h-[100px] px-3 py-2 text-sm focus:outline-none empty:before:text-text-secondary empty:before:content-[attr(data-placeholder)] ${PROSE}`}
      />
    </div>
  );
}
