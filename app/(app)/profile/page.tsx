import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCode, ageFromDob, formatTime12 } from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border py-2 last:border-0">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary">{value ?? "—"}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const { data: shift } = await supabase
    .from("shifts").select("*").eq("employee_id", profile.id).eq("is_active", true).maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-5">
          <AvatarUpload current={profile.avatar_url} gender={profile.gender} size={72} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-h1 text-text-primary">{profile.full_name}</h2>
              <Badge tone="neutral">{formatCode(profile.employee_code)}</Badge>
            </div>
            <p className="text-caption text-text-secondary">{profile.position} · {profile.department}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My details</CardTitle>
          <p className="text-caption text-text-secondary">
            Your details are managed by HR. To update them or your photo, contact an administrator —
            you can change your profile photo here.
          </p>
        </CardHeader>
        <CardContent>
          <Row label="Email" value={profile.email} />
          {profile.email_secondary && <Row label="Email 2" value={profile.email_secondary} />}
          <Row label="Phone" value={profile.phone} />
          <Row label="CNIC" value={profile.cnic} />
          <Row label="Date of birth" value={profile.date_of_birth ? `${profile.date_of_birth} (age ${ageFromDob(profile.date_of_birth)})` : "—"} />
          <Row label="Employment type" value={<span className="capitalize">{profile.employment_type}</span>} />
          <Row label="Joining date" value={profile.joining_date} />
          {shift && <Row label="Shift" value={`${formatTime12(shift.start_time)} – ${formatTime12(shift.end_time)}`} />}
        </CardContent>
      </Card>
    </div>
  );
}
