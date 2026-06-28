"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function CredentialsCard({
  employeeId,
  fullName,
  username,
  password,
}: {
  employeeId: string;
  fullName: string;
  username: string | null;
  password: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);
  const [u, setU] = useState(username ?? "");
  const [p, setP] = useState(password ?? "");
  const [busy, setBusy] = useState(false);

  function copy() {
    const text = `Login credentials for ${fullName}\nPortal: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nUsername: ${username ?? "—"}\nPassword: ${password ?? "—"}`;
    navigator.clipboard.writeText(text).then(
      () => toast.success("Credentials copied"),
      () => toast.error("Copy failed")
    );
  }

  async function save() {
    setBusy(true);
    const res = await fetch("/api/admin/credentials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employeeId, username: u, password: p || undefined }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success("Credentials updated");
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={u} onChange={(e) => setU(e.target.value)} placeholder="first.last" />
          </div>
          <div className="space-y-1.5">
            <Label>New password (leave blank to keep)</Label>
            <Input value={p} onChange={(e) => setP(e.target.value)} placeholder="Softonoma@…" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1 text-sm">
        <div><span className="text-text-secondary">Username:</span> <span className="font-medium tabular">{username ?? "—"}</span></div>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary">Password:</span>
          <span className="font-medium tabular">{password ? (show ? password : "•".repeat(Math.min(password.length, 12))) : "—"}</span>
          <button onClick={() => setShow((s) => !s)} className="text-text-secondary hover:text-brand-primary" aria-label="Toggle password">
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={copy}><Copy className="size-4" /> Copy</Button>
        <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
      </div>
    </div>
  );
}
