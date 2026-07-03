"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { navForRole } from "@/lib/nav";
import type { Profile } from "@/lib/types";

const TITLE_OVERRIDES: Record<string, string> = { logs: "Activity Log", crm: "CRM" };
function titleFromPath(path: string): string {
  const seg = path.replace(/^\/admin\//, "").replace(/^\//, "").split("/")[0] || "dashboard";
  return TITLE_OVERRIDES[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const items = navForRole(profile);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (navigating dismisses it).
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={items} role={profile.role} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={titleFromPath(pathname)}
          fullName={profile.full_name}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
