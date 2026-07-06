"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette, type PaletteItem } from "./command-palette";
import { SessionGuard } from "./session-guard";
import { navForPerms, isNavGroup } from "@/lib/nav";
import { PERM } from "@/lib/access/permissions";
import type { Profile } from "@/lib/types";

const TITLE_OVERRIDES: Record<string, string> = { logs: "Activity Log", crm: "CRM" };
function titleFromPath(path: string): string {
  const seg = path.replace(/^\/admin\//, "").replace(/^\//, "").split("/")[0] || "dashboard";
  return TITLE_OVERRIDES[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function AppShell({ profile, perms, children }: { profile: Profile; perms: string[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const items = navForPerms(perms);
  // flattened, deduped destinations for the ⌘K palette
  const paletteItems: PaletteItem[] = [];
  const seen = new Set<string>();
  for (const e of items) {
    const list = isNavGroup(e) ? e.children.map((c) => ({ ...c, group: e.label })) : [{ ...e, group: "Pages" }];
    for (const i of list) {
      if (seen.has(i.href + i.label)) continue;
      seen.add(i.href + i.label);
      paletteItems.push({ label: i.label, href: i.href, group: i.group });
    }
  }
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
          showAlerts={perms.includes(PERM.notificationsView)}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 sm:p-6">{children}</main>
        <CommandPalette items={paletteItems} canSearchEmployees={perms.includes(PERM.employeesView)} />
        <SessionGuard />
      </div>
    </div>
  );
}
