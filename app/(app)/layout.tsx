import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm } from "@/lib/crm/access";
import { AppShell } from "@/components/layout/app-shell";
import { InterviewReminders } from "@/components/crm/interview-reminders";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return (
    <AppShell profile={profile}>
      {children}
      <InterviewReminders enabled={canSeeCrm(profile)} employeeId={profile.id} />
    </AppShell>
  );
}
