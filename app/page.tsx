import { redirect } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  redirect(isAdmin(profile.role) ? "/admin/dashboard" : "/dashboard");
}
