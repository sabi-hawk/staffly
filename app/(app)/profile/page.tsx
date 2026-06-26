import { getCurrentProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default async function ProfilePage() {
  const profile = (await getCurrentProfile())!;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{profile.full_name}</CardTitle>
          <CardDescription>
            {profile.position} · {profile.department} · {profile.email} ·{" "}
            <span className="capitalize">{profile.employment_type}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
