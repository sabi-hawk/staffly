"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, KeyRound, Loader2 } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/crm/status-pill";
import { ProfileRowActions } from "@/components/crm/profile-row-actions";
import { ColorChip, StackBadge } from "@/components/crm/crm-cells";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Per-row password: fetched lazily from the route (never embedded in the page), revealed or copied on
// demand. Only rendered for viewers allowed to see passwords (super-admin + Partner BD).
function PasswordCell({ profileId }: { profileId: string }) {
  const [pw, setPw] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);

  async function fetchPw(): Promise<string | null> {
    if (pw !== null) return pw;
    setBusy(true);
    const res = await fetch(`/api/crm/profiles/${profileId}/password`);
    setBusy(false);
    if (!res.ok) { toast.error("Could not read the password"); return null; }
    const { password } = await res.json();
    setPw(password ?? "");
    return password ?? "";
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular text-text-secondary">{shown && pw ? (pw || "—") : "••••••"}</span>
      <button
        onClick={async () => { const v = await fetchPw(); if (v !== null) setShown((s) => !s); }}
        disabled={busy}
        className="text-text-secondary hover:text-brand-primary disabled:opacity-40"
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
      <button
        onClick={async () => { const v = await fetchPw(); if (v) { navigator.clipboard.writeText(v).then(() => toast.success("Password copied"), () => toast.error("Copy failed")); } else if (v === "") toast.error("No password set"); }}
        disabled={busy}
        className="text-text-secondary hover:text-brand-primary disabled:opacity-40"
        aria-label="Copy password"
      >
        <Copy className="size-3.5" />
      </button>
    </span>
  );
}

export function ProfilesGrid({ rows, canManage, canSeePasswords }: { rows: any[]; canManage: boolean; canSeePasswords: boolean }) {
  const [showPw, setShowPw] = useState(false);

  return (
    <>
      {canSeePasswords && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setShowPw((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-caption text-text-secondary hover:bg-surface"
          >
            <KeyRound className="size-3.5" />
            {showPw ? "Hide passwords" : "Show passwords"}
          </button>
        </div>
      )}
      <Table>
        <THead>
          <TR>
            <TH>#</TH><TH>Name</TH><TH>Email</TH><TH>Stack</TH><TH>Owner (BD)</TH><TH>Mobile</TH>
            {canSeePasswords && showPw && <TH>Password</TH>}
            <TH>Status</TH><TH></TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((p) => (
            <TR key={p.id}>
              <TD><span className="rounded bg-brand-light px-1.5 py-0.5 font-mono text-caption text-brand-primary">#{p.profile_no}</span></TD>
              <TD><Link href={`/crm/profiles/${p.id}`} className="font-medium text-text-primary hover:text-brand-primary">{p.name}</Link></TD>
              <TD className="text-text-secondary">{p.email ?? "—"}</TD>
              <TD><StackBadge name={p.stack?.name} color={p.stack?.color} /></TD>
              <TD>{p.owner?.full_name ? <ColorChip label={p.owner.full_name} color={p.owner.color} /> : <span className="text-text-secondary">Unassigned</span>}</TD>
              <TD className="text-text-secondary">{p.mobile ?? "—"}</TD>
              {canSeePasswords && showPw && <TD><PasswordCell profileId={p.id} /></TD>}
              <TD><StatusPill status={p.status} /></TD>
              <TD>{canManage ? <ProfileRowActions profileId={p.id} name={p.name} /> : null}</TD>
            </TR>
          ))}
          {rows.length === 0 && <TR><TD colSpan={9} className="py-6 text-center text-text-secondary">No profiles match.</TD></TR>}
        </TBody>
      </Table>
    </>
  );
}
