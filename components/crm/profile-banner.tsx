"use client";
// Profile banner: identity + facts, with in-place editing (owner, 2026-07-07: no separate
// "Edit profile" card; click Edit on the banner and the fields become editable, like interviews).
// Internal notes are deliberately NOT shown here; they live in the edit form only.
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileForm, type Opt } from "./profile-form";

export function ProfileBanner({
  profile,
  stackName,
  ownerName,
  canEdit,
  stacks,
  owners,
}: {
  profile: {
    id: string; profile_no: number; name: string; status: string;
    email: string | null; mobile: string | null; dob: string | null; notes: string | null;
    owner_bd_id: string | null; stack_name: string | null;
  };
  stackName: string;
  ownerName: string;
  canEdit: boolean;
  stacks: Opt[];
  owners: Opt[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-brand-light px-2 py-0.5 font-mono text-base text-brand-primary">#{profile.profile_no}</span>
          {profile.name} · {stackName}
        </CardTitle>
        <span className="flex items-center gap-2">
          <Badge tone={profile.status === "active" ? "success" : "neutral"}>{profile.status}</Badge>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)} aria-label={editing ? "Cancel editing" : "Edit profile"}>
              {editing ? <><X className="size-3.5" /> Cancel</> : <><Pencil className="size-3.5" /> Edit</>}
            </Button>
          )}
        </span>
      </CardHeader>
      <CardContent>
        {editing ? (
          <ProfileForm
            id={profile.id}
            stacks={stacks}
            owners={owners}
            initial={{
              name: profile.name,
              stack: profile.stack_name ?? "",
              owner_bd_id: profile.owner_bd_id,
              email: profile.email,
              mobile: profile.mobile,
              dob: profile.dob,
              status: profile.status,
              notes: profile.notes,
            }}
            onSaved={() => setEditing(false)}
          />
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-caption text-text-secondary">Owner (BD)</dt><dd>{ownerName}</dd></div>
            <div><dt className="text-caption text-text-secondary">Email</dt><dd>{profile.email ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Mobile</dt><dd>{profile.mobile ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Date of birth</dt><dd>{profile.dob ?? "—"}</dd></div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
