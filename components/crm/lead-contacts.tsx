"use client";
// Company-side contacts on a lead: the CLIENT's representatives (HR / recruiter / admin / hiring
// manager / other) with email / phone / LinkedIn. Optional — logged so we can re-reach past leads
// later. Owner-scoped by RLS; BD owner / BD-Lead / admin can add/edit/delete.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Mail, Phone, Link2, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { InfoHint } from "@/components/crm/info-hint";
import { FieldLabel } from "@/components/crm/field-label";
import { CONTACT_HINTS } from "@/lib/crm/field-hints";

const TYPE_LABELS: Record<string, string> = {
  hr: "Company HR", recruiter: "Recruiter", company_admin: "Company Admin",
  hiring_manager: "Hiring Manager", other: "Other",
};
const selectCls = "h-9 w-full rounded-md border border-border bg-white px-3 text-sm";

export type Contact = {
  id: string; contact_type: string; other_type: string | null; name: string | null;
  email: string | null; phone: string | null; linkedin_url: string | null; note: string | null;
};

function ContactForm({ initial, onSubmit, onCancel }: { initial?: Partial<Contact>; onSubmit: (v: any) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({
    contact_type: initial?.contact_type ?? "hr",
    other_type: initial?.other_type ?? "",
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    linkedin_url: initial?.linkedin_url ?? "",
    note: initial?.note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(form); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-md border border-border bg-surface/40 p-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <FieldLabel htmlFor="lc-type" hint={CONTACT_HINTS.contact_type}>Who is this?</FieldLabel>
        <select id="lc-type" className={selectCls} value={form.contact_type} onChange={(e) => set("contact_type", e.target.value)}>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {form.contact_type === "other" && (
        <div className="space-y-1.5">
          <Label htmlFor="lc-other">Their role</Label>
          <Input id="lc-other" value={form.other_type} onChange={(e) => set("other_type", e.target.value)} placeholder="e.g. Founder, CTO…" />
        </div>
      )}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="lc-name" hint={CONTACT_HINTS.name}>Name</FieldLabel>
        <Input id="lc-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Contact name" />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="lc-email" hint={CONTACT_HINTS.email}>Email</FieldLabel>
        <Input id="lc-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@acme.com" />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="lc-phone" hint={CONTACT_HINTS.phone}>Phone</FieldLabel>
        <Input id="lc-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92 300 …" />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="lc-linkedin" hint={CONTACT_HINTS.linkedin_url}>LinkedIn</FieldLabel>
        <Input id="lc-linkedin" value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" />
      </div>
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <FieldLabel htmlFor="lc-note" hint={CONTACT_HINTS.note}>Note</FieldLabel>
        <Input id="lc-note" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Anything else worth remembering" />
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save contact"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}

// Only linkify http(s) URLs — never render an attacker-typed javascript:/data: URL as a live link.
function safeHttp(url: string | null | undefined): string | undefined {
  return url && /^https?:\/\//i.test(url.trim()) ? url.trim() : undefined;
}

function Channel({ icon: Icon, children, href }: { icon: any; children: React.ReactNode; href?: string }) {
  const inner = (
    <span className="inline-flex items-center gap-1 text-text-secondary">
      <Icon className="size-3.5" /> {children}
    </span>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer" className="hover:text-brand-primary">{inner}</a> : inner;
}

export function LeadContacts({ leadId, contacts, canEdit }: { leadId: string; contacts: Contact[]; canEdit: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function create(v: any) {
    const res = await fetch(`/api/crm/leads/${leadId}/contacts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(v) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(j.error ?? "Failed to add"); return; }
    toast.success("Contact added"); setAdding(false); router.refresh();
  }
  async function update(id: string, v: any) {
    const res = await fetch(`/api/crm/contacts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(v) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(j.error ?? "Failed to save"); return; }
    toast.success("Contact saved"); setEditingId(null); router.refresh();
  }
  async function del(id: string) {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/crm/contacts/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); router.refresh(); } else toast.error("Failed");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-1.5">
          <CardTitle>Company contacts</CardTitle>
          <InfoHint text="The client company's people (HR, recruiter, etc.) and how to reach them — for following up on this or future openings." label="Company contacts" />
        </div>
        {canEdit && !adding && (
          <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditingId(null); }}><Plus className="size-4" /> Add contact</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-caption text-text-secondary">
          Optional. Log the <span className="font-medium">company's</span> representatives — the HR, recruiter, admin or
          manager who reached out (or that you found) — with their email, phone or LinkedIn. This builds a directory we can
          reach back out to later (e.g. during a slow month) about this or new roles. Not our own contact details.
        </p>

        {adding && <ContactForm onSubmit={create} onCancel={() => setAdding(false)} />}

        {contacts.length === 0 && !adding && (
          <p className="text-sm text-text-secondary">No contacts logged yet.</p>
        )}

        <div className="space-y-2">
          {contacts.map((c) => (
            editingId === c.id ? (
              <ContactForm key={c.id} initial={c} onSubmit={(v) => update(c.id, v)} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={c.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-surface px-1.5 py-0.5 text-caption font-medium text-text-primary">
                        {c.contact_type === "other" ? (c.other_type || "Other") : TYPE_LABELS[c.contact_type]}
                      </span>
                      {c.name && <span className="text-sm font-medium">{c.name}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption">
                      {c.email && <Channel icon={Mail} href={`mailto:${c.email}`}>{c.email}</Channel>}
                      {c.phone && <Channel icon={Phone} href={`tel:${c.phone}`}>{c.phone}</Channel>}
                      {c.linkedin_url && <Channel icon={Link2} href={safeHttp(c.linkedin_url)}>LinkedIn</Channel>}
                      {!c.email && !c.phone && !c.linkedin_url && !c.name && <Channel icon={User}>—</Channel>}
                    </div>
                    {c.note && <p className="text-caption text-text-secondary">{c.note}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(c.id); setAdding(false); }} aria-label="Edit contact"><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => del(c.id)} aria-label="Delete contact"><Trash2 className="size-4" /></Button>
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
