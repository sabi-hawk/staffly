"use client";
// Styled file picker — the platform standard replacing every native <input type="file">
// (owner, 2026-07-07). Shows a proper button + the chosen file name, and accepts drag & drop.
import * as React from "react";
import { Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileInput({
  file,
  onChange,
  accept,
  id,
  disabled,
  placeholder = "Choose a file or drag it here",
  className,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  return (
    <div
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-md border border-dashed border-border bg-white px-2 text-sm transition-colors",
        dragging && "border-brand-primary bg-brand-light/30",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onChange(f);
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-brand-light hover:text-brand-primary"
      >
        <Paperclip className="size-3.5" /> Browse
      </button>
      {file ? (
        <>
          <span className="min-w-0 flex-1 truncate text-text-primary">{file.name}</span>
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="shrink-0 rounded-md p-1 text-text-secondary hover:text-danger"
            aria-label="Clear file"
          >
            <X className="size-3.5" />
          </button>
        </>
      ) : (
        <span className="min-w-0 flex-1 truncate text-text-secondary/70">{placeholder}</span>
      )}
    </div>
  );
}
