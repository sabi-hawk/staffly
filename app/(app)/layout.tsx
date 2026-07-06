import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getMyPerms } from "@/lib/access/perms.server";
import { PERM } from "@/lib/access/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { InterviewReminders } from "@/components/crm/interview-reminders";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const perms = await getMyPerms();
  return (
    <AppShell profile={profile} perms={Array.from(perms)}>
      {children}
      <InterviewReminders enabled={perms.has(PERM.crmAccess)} employeeId={profile.id} />
    </AppShell>
  );
}
