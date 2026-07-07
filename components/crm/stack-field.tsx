"use client";
// Stack picker for a dev-profile: a dropdown of existing stacks (same look/behaviour as the other
// select fields) plus an "Add a new stack" action. A newly added stack shows immediately as the
// selected value and is created on the backend when the profile is saved (find-or-create by name).
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { FloatSelect, FloatInput } from "@/components/ui/field";
import type { Opt } from "@/lib/crm/options";

const ADD = "__add_new_stack__";

export function StackField({
  value,
  onChange,
  stacks,
}: {
  value: string; // stack NAME
  onChange: (name: string) => void;
  stacks: Opt[]; // existing stacks (label = name)
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  // union of existing stack names + the current value if it's a custom one not in the list
  const names = useMemo(() => {
    const set = new Set(stacks.map((s) => s.label));
    if (value && !set.has(value)) set.add(value);
    return Array.from(set);
  }, [stacks, value]);

  function confirmAdd() {
    const name = draft.trim();
    if (!name) return;
    onChange(name);
    setDraft("");
    setAdding(false);
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1.5">
        <FloatInput
          id="profile-stack-new"
          label="New stack name *"
          hint="Type the new stack, e.g. Mobile (React Native). It is created when you save the profile."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmAdd(); } }}
          wrapClassName="flex-1"
          autoFocus
        />
        <button type="button" onClick={confirmAdd} aria-label="Add stack"
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-success/50 bg-success/10 text-success hover:bg-success/20">
          <Check className="size-4" />
        </button>
        <button type="button" onClick={() => { setAdding(false); setDraft(""); }} aria-label="Cancel"
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-white text-text-secondary hover:bg-surface">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <FloatSelect
      id="profile-stack"
      label="Stack"
      hint="The candidate's primary tech stack. Pick an existing one or add a new stack."
      value={value}
      onChange={(e) => {
        if (e.target.value === ADD) { setAdding(true); return; }
        onChange(e.target.value);
      }}
    >
      <option value="">Not set</option>
      {names.map((n) => <option key={n} value={n}>{n}</option>)}
      <option value={ADD}>+ Add a new stack…</option>
    </FloatSelect>
  );
}
