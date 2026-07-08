import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { InterviewReminders } from "@/components/crm/interview-reminders";
import { DangerFetchInstaller } from "@/components/ui/danger-fetch";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const perms = profile.perms ?? [];
  return (
    <AppShell profile={profile} perms={perms}>
      {children}
      <InterviewReminders enabled={perms.includes(PERM.crmAccess)} employeeId={profile.id} />
      {/* Gates every super-admin hard delete behind the platform danger password (active only when
          DANGER_PASSWORD is set). Inert for non-super users. */}
      <DangerFetchInstaller />
    </AppShell>
  );
}
